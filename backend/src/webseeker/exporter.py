import hashlib, json, os, re, zipfile
from datetime import date, datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit

VERSION = "0.1.0"
CATS = [("html", "pages"), ("css", "css"), ("javascript", "javascript"), ("image/", "images"), ("font", "fonts"),
        ("video", "media"), ("audio", "media"), ("pdf", "documents"), ("json", "data"), ("xml", "data"), ("csv", "data")]


class Cancelled(Exception): pass
class ExportError(Exception): pass


def category(mime: str | None) -> str:
    m = (mime or "").lower()
    return next((c for k, c in CATS if k in m), "other-assets")


def safe_name(url: str) -> str:
    seg = PurePosixPath(urlsplit(url).path).name or "index"
    return re.sub(r"[^A-Za-z0-9._-]", "_", seg).lstrip(".")[:80] or "file"


def export_project(rows: list[dict], store: Path, dest: Path, meta: dict,
                   cancelled=lambda: False) -> dict:
    slug = re.sub(r"[^a-z0-9]+", "-", meta["host"].lower()).strip("-")
    root = f"web-seeker-{slug}-{date.today():%Y-%m-%d}"
    tmp = dest.with_suffix(".part")
    used: set[str] = set()
    entries: list[dict] = []
    missing: list[str] = []
    hit_cancel = False
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for r in rows:
            if cancelled():
                hit_cancel = True
                break
            src = store / "content" / r["sha256"][:2] / r["sha256"]
            if not src.exists():
                missing.append(r["url"])
                continue
            name = safe_name(r["url"])
            rel = f"website/{category(r['mime'])}/{name}"
            if rel in used:                                   # avoid duplicate archive paths
                p = PurePosixPath(name)
                rel = f"website/{category(r['mime'])}/{p.stem}-{r['sha256'][:8]}{p.suffix}"
            used.add(rel)
            z.write(src, f"{root}/{rel}")                     # streamed from disk in chunks
            entries.append({"path": rel, "source_url": r["url"], "content_type": r["mime"],
                            "size": r.get("size", r.get("bytes", 0)), "sha256": r["sha256"]})
        if not hit_cancel:
            manifest = {
                "generator": {"app": "In Net Web Seeker", "version": VERSION,
                              "powered_by": "IN NET Creations", "created_by": "S. Manohar"},
                "export_id": meta["export_id"], "project_id": meta["project_id"], "target": meta["target"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "totals": {"included": len(entries), "missing": len(missing)},
                "missing_resources": missing, "files": entries,
                "limitations": ["Only publicly accessible resources inside the configured scope were collected."],
            }
            z.writestr(f"{root}/manifest.json", json.dumps(manifest, indent=2))
            z.writestr(f"{root}/checksums.sha256", "\n".join(f"{e['sha256']}  {e['path']}" for e in entries))
            z.writestr(f"{root}/README.txt",
                       "Exported by In Net Web Seeker. Powered by IN NET Creations. Created by S. Manohar.\n"
                       "Verify with the app's Verify export tool or check checksums.sha256.\n")
    if hit_cancel:
        tmp.unlink(missing_ok=True)
        raise Cancelled()
    ok, problems = verify_zip(tmp)
    if not ok:
        tmp.unlink(missing_ok=True)
        raise ExportError("; ".join(problems))
    os.replace(tmp, dest)                                     # success only after validation
    return {"files": len(entries), "missing": len(missing), "archive_bytes": dest.stat().st_size}


def verify_zip(path: Path) -> tuple[bool, list[str]]:
    problems: list[str] = []
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        for n in names:
            if n.startswith(("/", "\\")) or ".." in PurePosixPath(n).parts:
                problems.append(f"unsafe path: {n}")
        mname = next((n for n in names if n.endswith("/manifest.json") and n.count("/") == 1), None)
        if not mname:
            return False, problems + ["manifest.json missing"]
        manifest = json.loads(z.read(mname))
        root = mname.rsplit("/", 1)[0]
        for e in manifest["files"]:
            try:
                info = z.getinfo(f"{root}/{e['path']}")
            except KeyError:
                problems.append(f"missing: {e['path']}")
                continue
            h, total = hashlib.sha256(), 0
            with z.open(info) as f:
                while chunk := f.read(1 << 16):
                    h.update(chunk)
                    total += len(chunk)
            if total != e["size"] or h.hexdigest() != e["sha256"]:
                problems.append(f"checksum/size mismatch: {e['path']}")
    return not problems, problems
