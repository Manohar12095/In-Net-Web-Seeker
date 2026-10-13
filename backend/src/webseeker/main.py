# main.py
import asyncio, json, os, secrets, uuid
from dataclasses import asdict
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from . import db
from .crawler import Crawler, Limits
from .exporter import export_project, verify_zip
from .ssrf import make_client
from .target_parser import parse_target
from .intelligence import dns as dns_intel
from .intelligence import rdap as rdap_intel
from .intelligence import tls as tls_intel
from .intelligence import headers as headers_intel
from .intelligence import tech as tech_intel


TOKEN = os.environ.get("WEBSEEKER_TOKEN", "")
DATA = Path(os.environ.get("WEBSEEKER_DATA", "/tmp/data"))
db.init(DATA)


def auth(request: Request, authorization: str = Header(default=""), token: str = Query(default="")):
    path = request.url.path

    # Allow direct browser download of generated ZIP archives and crawled assets
    if (path.startswith("/api/exports/") and path.endswith("/download")) or \
       (path.startswith("/api/projects/") and (path.endswith("/download") or path.endswith("/content") or path.endswith("/export-bundle"))):
        return

    # Same-origin web app requests on Vercel or localhost are permitted
    sec_fetch = request.headers.get("sec-fetch-site", "")
    referer = request.headers.get("referer", "")
    host = request.headers.get("host", "")
    if sec_fetch == "same-origin" or (host and host in referer):
        return

    # If no token is set in environment (e.g. initial web deployment), permit requests
    if not TOKEN:
        return

    provided = ""
    if authorization:
        if authorization.startswith("Bearer "):
            provided = authorization[7:].strip()
        else:
            provided = authorization.strip()
    elif token:
        provided = token.strip()

    if not secrets.compare_digest(provided, TOKEN):
        raise HTTPException(401, {"code": "unauthorized", "message": "Missing or invalid token", "retryable": False})


app = FastAPI(title="In Net Web Seeker engine", dependencies=[Depends(auth)])
app.add_middleware(CORSMiddleware, allow_headers=["*"], allow_methods=["*"],
                   allow_origins=["tauri://localhost", "http://tauri.localhost",
                                  "http://localhost:1420", "http://localhost:5173",
                                  # Vercel deployments (Services routing is same-origin,
                                  # but allow vercel.app domain as a safety net)
                                  "https://*.vercel.app"],
                   allow_origin_regex=r"https://.*\.vercel\.app")


class StartReq(BaseModel):
    project_id: str
    target: str
    depth: int = Field(2, ge=0, le=6)
    max_pages: int = Field(200, ge=1, le=5000)
    concurrency: int = Field(6, ge=1, le=20)
    max_file_mb: int = Field(25, ge=1, le=500)


class NewProject(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    target: str


class Job:
    def __init__(self) -> None:
        self.q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self.crawler: Crawler | None = None


JOBS: dict[str, Job] = {}


@app.get("/api/health")
@app.get("/health")
@app.get("/api/index.py")
def health(): return {"ok": True}


@app.get("/api/targets/validate")
def validate(input: str): return asdict(parse_target(input))


@app.get("/api/projects")
def projects(): return db.list_projects()


@app.get("/api/projects/{pid}")
def project_detail(pid: str):
    p = db.get_project(pid)
    if not p:
        raise HTTPException(404, {"code": "not_found", "message": "Project not found"})
    return p


@app.post("/api/projects")
def new_project(body: NewProject): return db.create_project(body.name, body.target)


@app.post("/api/collections")
async def start(req: StartReq):
    t = parse_target(req.target)
    if t.errors:
        raise HTTPException(422, {"code": "invalid_target", "message": "; ".join(t.errors), "retryable": False})
    run_id = db.create_run(req.project_id, req.model_dump())
    job = JOBS[run_id] = Job()
    store = DATA / "projects" / req.project_id

    def push(ev: dict) -> None:
        if job.q.full():
            job.q.get_nowait()                    # live tail only; full history is in the database
        job.q.put_nowait(ev)

    async def emit(kind: str, data: dict) -> None:
        db.save_event(run_id, kind, data)
        push({"type": kind, **data})

    async def go() -> None:
        status = "failed"
        client = make_client()
        try:
            job.crawler = Crawler(client, t.normalized,
                                  Limits(req.depth, req.max_pages, req.concurrency, req.max_file_mb * 1_000_000),
                                  store, emit)
            await job.crawler.run(t.normalized)
            status = "cancelled" if job.crawler.cancel.is_set() else "done"
        except Exception as e:
            await emit("error", {"error": repr(e)})
        finally:
            await client.aclose()
            db.finish_run(run_id, status)
            push({"type": "end", "status": status})

    asyncio.create_task(go())
    return {"run_id": run_id}


@app.get("/api/collections/{run_id}/events")
async def events(run_id: str):
    job = JOBS.get(run_id)
    if not job:
        run_record = db.get_run(run_id)
        if not run_record:
            raise HTTPException(404, {"code": "not_found", "message": "Unknown run", "retryable": False})

        project_id = run_record["project_id"]
        cfg = run_record.get("config") or {}
        r_status = run_record.get("status")

        # If run is already completed in database, stream back saved resources
        if r_status in ("done", "cancelled", "failed"):
            async def replay():
                saved = db.all_resources_for_project(project_id, run_id)
                for r in saved:
                    yield f"data: {json.dumps({'type': 'resource', **r})}\n\n"
                yield f"data: {json.dumps({'type': 'end', 'status': r_status})}\n\n"
            return StreamingResponse(replay(), media_type="text/event-stream")

        # In serverless environment, run the crawler inside the active SSE stream
        target = cfg.get("target") or ""
        t = parse_target(target)
        if t.errors:
            async def err_gen():
                yield f"data: {json.dumps({'type': 'error', 'error': '; '.join(t.errors)})}\n\n"
                yield f"data: {json.dumps({'type': 'end', 'status': 'failed'})}\n\n"
            return StreamingResponse(err_gen(), media_type="text/event-stream")

        job = JOBS[run_id] = Job()
        store = DATA / "projects" / project_id

        def push(ev: dict) -> None:
            if job.q.full():
                job.q.get_nowait()
            job.q.put_nowait(ev)

        async def emit(kind: str, data: dict) -> None:
            db.save_event(run_id, kind, data)
            push({"type": kind, **data})

        async def go() -> None:
            c_status = "failed"
            client = make_client()
            try:
                job.crawler = Crawler(
                    client,
                    t.normalized,
                    Limits(
                        int(cfg.get("depth", 1)),
                        int(cfg.get("max_pages", 50)),
                        int(cfg.get("concurrency", 4)),
                        int(cfg.get("max_file_mb", 25)) * 1_000_000,
                    ),
                    store,
                    emit,
                )
                await job.crawler.run(t.normalized)
                c_status = "cancelled" if job.crawler.cancel.is_set() else "done"
            except Exception as e:
                await emit("error", {"error": repr(e)})
            finally:
                await client.aclose()
                db.finish_run(run_id, c_status)
                push({"type": "end", "status": c_status})

        asyncio.create_task(go())

    async def gen():
        while True:
            try:
                ev = await asyncio.wait_for(job.q.get(), timeout=15.0)
                yield f"data: {json.dumps(ev)}\n\n"
                if ev.get("type") == "end":
                    break
            except asyncio.TimeoutError:
                # Keep-alive heartbeat ping
                yield ": ping\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/collections/{run_id}/cancel")
def cancel(run_id: str):
    job = JOBS.get(run_id)
    if job and job.crawler:
        job.crawler.cancel.set()
    db.finish_run(run_id, "cancelled")
    return {"ok": True}


@app.get("/api/projects/{pid}/resources")
def project_resources(pid: str):
    """List all successfully collected resources for a project."""
    return db.resources_for_project(pid)


@app.get("/api/projects/{pid}/all-resources")
def project_all_resources(pid: str, run_id: str | None = None):
    """List all resources (ok, http_error, skipped, blocked) with metadata."""
    return db.all_resources_for_project(pid, run_id)


@app.get("/api/projects/{pid}/resources/{rid}/content")
def resource_content(pid: str, rid: int):
    """Return raw asset content for preview. Scoped strictly to content/<sha256[:2]>/<sha256>."""
    res = db.get_resource_by_id(rid)
    if not res:
        raise HTTPException(404, {"code": "not_found", "message": "Resource not found"})
    sha = res.get("sha256")
    if not sha:
        return Response(content=f"Resource has no downloaded body (status: {res.get('status')})", media_type="text/plain")

    file_path = DATA / "projects" / pid / "content" / sha[:2] / sha
    if not file_path.exists():
        raise HTTPException(404, {"code": "not_found", "message": "Asset file not found in storage"})

    data = file_path.read_bytes()
    mime = res.get("mime") or "application/octet-stream"
    return Response(content=data, media_type=mime)


@app.get("/api/projects/{pid}/resources/{rid}/download")
def resource_download(pid: str, rid: int):
    """Download an individual crawled file with its original filename and content disposition."""
    res = db.get_resource_by_id(rid)
    if not res:
        raise HTTPException(404, {"code": "not_found", "message": "Resource not found"})
    sha = res.get("sha256")
    if not sha:
        raise HTTPException(404, {"code": "no_content", "message": "Resource has no downloaded body"})

    file_path = DATA / "projects" / pid / "content" / sha[:2] / sha
    if not file_path.exists():
        raise HTTPException(404, {"code": "not_found", "message": "Asset file not found in storage"})

    raw_url = res.get("url") or ""
    path_part = raw_url.split("?")[0].split("#")[0].rstrip("/")
    filename = path_part.split("/")[-1] if path_part and "/" in path_part else "downloaded-resource"
    if "." not in filename:
        mime = (res.get("mime") or "").lower()
        if "html" in mime: filename += ".html"
        elif "css" in mime: filename += ".css"
        elif "javascript" in mime: filename += ".js"
        elif "json" in mime: filename += ".json"
        elif "svg" in mime: filename += ".svg"
        elif "png" in mime: filename += ".png"
        elif "jpeg" in mime or "jpg" in mime: filename += ".jpg"

    return FileResponse(file_path, media_type=res.get("mime") or "application/octet-stream", filename=filename)


# ── Intelligence Endpoints ───────────────────────────────────────────────────

@app.get("/api/intelligence/dns")
async def intel_dns(host: str):
    """Return DNS records for a host. All data labelled observed/unavailable."""
    t = parse_target(host)
    if t.errors:
        raise HTTPException(422, {"code": "invalid_target", "message": "; ".join(t.errors), "retryable": False})
    return await dns_intel.lookup(t.host)


@app.get("/api/intelligence/rdap")
async def intel_rdap(host: str):
    """Return RDAP registration data for a domain."""
    t = parse_target(host)
    if t.errors:
        raise HTTPException(422, {"code": "invalid_target", "message": "; ".join(t.errors), "retryable": False})
    if t.kind not in ("domain", "url"):
        return {"host": t.host, "source": "unavailable", "error": "RDAP is only available for domain names"}
    return await rdap_intel.lookup(t.host)


@app.get("/api/intelligence/tls")
async def intel_tls(host: str, port: int = 443):
    """Inspect TLS certificate chain, SANs, validity, and cipher suites."""
    t = parse_target(host)
    if t.errors:
        raise HTTPException(422, {"code": "invalid_target", "message": "; ".join(t.errors), "retryable": False})
    return await tls_intel.inspect(t.host, port=port or 443)


@app.get("/api/intelligence/headers")
async def intel_headers(target: str):
    """Passive security headers audit, cookies, and CORS scorecard."""
    t = parse_target(target)
    if t.errors:
        raise HTTPException(422, {"code": "invalid_target", "message": "; ".join(t.errors), "retryable": False})
    return await headers_intel.audit(t.normalized)


@app.get("/api/intelligence/tech")
async def intel_tech(target: str):
    """Passive technology fingerprinting across 60+ signatures."""
    t = parse_target(target)
    if t.errors:
        raise HTTPException(422, {"code": "invalid_target", "message": "; ".join(t.errors), "retryable": False})
    return await tech_intel.detect(t.normalized)


# ── Snapshots & Diffing ──────────────────────────────────────────────────────

@app.get("/api/projects/{pid}/diff")
def project_diff(pid: str, run_a: str = Query(...), run_b: str = Query(...)):
    """Compare two collection runs by SHA-256 and URLs."""
    return db.compare_runs(run_a, run_b)


# ── Exports & Verifier ───────────────────────────────────────────────────────

class ExportReq(BaseModel):
    name: str | None = None
    target: str | None = None
    resources: list[dict] | None = None


@app.post("/api/projects/{pid}/exports")
async def make_export(pid: str, req: ExportReq = ExportReq()):
    export_id = uuid.uuid4().hex
    dest = DATA / "exports" / f"{export_id}.zip"
    dest.parent.mkdir(parents=True, exist_ok=True)

    # 1. Look up existing project or re-register in current serverless container
    proj = db.get_project(pid)
    if not proj and req.target:
        proj = db.ensure_project(pid, req.name or pid, req.target)
    elif not proj:
        proj = next((p for p in db.list_projects() if p["id"] == pid), None)
    if not proj and (req.name or req.target):
        t = req.target or f"https://{req.name.split(' - ')[0]}"
        proj = db.ensure_project(pid, req.name or pid, t)
    elif not proj:
        raise HTTPException(404, {"code": "not_found", "message": "Unknown project", "retryable": False})

    host = parse_target(proj["target"]).host or "target"
    rows = db.resources_for_project(pid)
    if not rows and req.resources:
        rows = req.resources

    info = await asyncio.to_thread(export_project, rows, DATA / "projects" / pid, dest,
                                   {"host": host, "target": proj["target"], "project_id": pid, "export_id": export_id})
    return {"export_id": export_id, **info}


@app.get("/api/projects/{pid}/export-bundle")
@app.post("/api/projects/{pid}/export-bundle")
async def export_bundle_direct(pid: str, target: str = Query(""), name: str = Query("")):
    """Generate and stream the ZIP archive directly in a single request — zero container-hopping risk."""
    export_id = uuid.uuid4().hex
    dest = DATA / "exports" / f"{export_id}.zip"
    dest.parent.mkdir(parents=True, exist_ok=True)

    proj = db.get_project(pid)
    if not proj and target:
        proj = db.ensure_project(pid, name or pid, target)
    elif not proj:
        proj = next((p for p in db.list_projects() if p["id"] == pid), None)
    if not proj and (name or target):
        t = target or f"https://{name.split(' - ')[0]}"
        proj = db.ensure_project(pid, name or pid, t)
    elif not proj:
        raise HTTPException(404, {"code": "not_found", "message": "Unknown project", "retryable": False})

    host = parse_target(proj["target"]).host or "target"
    slug = re.sub(r"[^a-z0-9]+", "-", host.lower()).strip("-")
    rows = db.resources_for_project(pid)
    await asyncio.to_thread(export_project, rows, DATA / "projects" / pid, dest,
                            {"host": host, "target": proj["target"], "project_id": pid, "export_id": export_id})

    return FileResponse(dest, media_type="application/zip", filename=f"web-seeker-{slug}-{export_id[:8]}.zip")


@app.get("/api/exports/{export_id}/verify")
def verify_export(export_id: str):
    """Cryptographically verify an exported ZIP file against its SHA-256 checksums."""
    path = DATA / "exports" / f"{export_id}.zip"
    if not path.exists():
        raise HTTPException(404, {"code": "not_found", "message": "Export archive not found"})
    ok, problems = verify_zip(path)
    return {"valid": ok, "problems": problems, "export_id": export_id, "size": path.stat().st_size}


@app.get("/api/exports/{export_id}/download")
def download_export(export_id: str):
    """Direct browser download for the generated ZIP archive."""
    path = DATA / "exports" / f"{export_id}.zip"
    if not path.exists():
        raise HTTPException(404, {"code": "not_found", "message": "Export archive not found"})
    return FileResponse(path, media_type="application/zip", filename=f"web-seeker-{export_id[:8]}.zip")
