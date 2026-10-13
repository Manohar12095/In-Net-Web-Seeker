import asyncio, hashlib, os, uuid
from pathlib import Path
from typing import Callable
import httpx
from .ssrf import BlockedDestination

SIGS = [(b"\x89PNG\r\n\x1a\n", "png"), (b"\xff\xd8\xff", "jpeg"), (b"GIF8", "gif"), (b"%PDF-", "pdf"),
        (b"wOF2", "woff2"), (b"wOFF", "woff"), (b"PK\x03\x04", "zip"), (b"\x00\x00\x01\x00", "ico")]


def sniff(head: bytes) -> str:
    for sig, name in SIGS:
        if head.startswith(sig):
            return name
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    t = head.lstrip().lower()
    if t.startswith((b"<!doctype html", b"<html")):
        return "html"
    if t.startswith((b"<svg", b"<?xml")):
        return "xml/svg"
    return "unknown"


async def download(client: httpx.AsyncClient, url: str, store: Path, *, max_bytes: int,
                   scope: Callable[[str], bool], max_redirects: int = 5) -> dict:
    hops: list[str] = []
    try:
        for _ in range(max_redirects + 1):
            if not scope(url):
                return {"status": "skipped", "error": "out of scope", "final_url": url}
            async with client.stream("GET", url) as r:
                if r.is_redirect:
                    loc = r.headers.get("location")
                    if not loc:
                        return {"status": "error", "error": "redirect without Location", "final_url": url}
                    hops.append(url)
                    url = str(r.url.join(loc))
                    continue
                base = {"final_url": url, "http_status": r.status_code, "redirects": hops,
                        "mime": r.headers.get("content-type", "").split(";")[0].strip().lower()}
                if r.status_code >= 400:
                    ra = r.headers.get("retry-after", "")
                    return {**base, "status": "http_error", "retry_after": int(ra) if ra.isdigit() else None}
                if int(r.headers.get("content-length") or 0) > max_bytes:
                    return {**base, "status": "too_large"}
                return {**base, **await _save(r, store, max_bytes)}
        return {"status": "error", "error": "too many redirects", "final_url": url}
    except BlockedDestination as e:
        return {"status": "blocked", "error": str(e), "final_url": url}
    except httpx.HTTPError as e:
        return {"status": "error", "error": f"{type(e).__name__}: {e}", "final_url": url, "retryable": True}


async def _save(r: httpx.Response, store: Path, max_bytes: int) -> dict:
    tmp_dir = store / "tmp"                      # sweep leftovers here on startup (interrupted downloads)
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp = tmp_dir / f"{uuid.uuid4().hex}.part"
    h, size, head, too_big = hashlib.sha256(), 0, b"", False
    with tmp.open("wb") as f:
        async for chunk in r.aiter_bytes(65536):   # decoded bytes, so the cap also stops decompression bombs
            size += len(chunk)
            if size > max_bytes:
                too_big = True
                break
            h.update(chunk)
            f.write(chunk)
            if len(head) < 32:
                head += chunk[: 32 - len(head)]
    if too_big:
        tmp.unlink(missing_ok=True)
        return {"status": "too_large", "bytes": size}
    digest = h.hexdigest()
    final = store / "content" / digest[:2] / digest
    dup = final.exists()
    if dup:
        tmp.unlink()
    else:
        final.parent.mkdir(parents=True, exist_ok=True)
        os.replace(tmp, final)                     # atomic finalize
    return {"status": "ok", "bytes": size, "sha256": digest, "detected": sniff(head),
            "duplicate": dup, "path": str(final)}


async def download_retry(*a, **k) -> dict:
    res: dict = {}
    for attempt in range(3):
        res = await download(*a, **k)
        if res.get("http_status") in (429, 503) or res.get("retryable"):
            await asyncio.sleep(min(res.get("retry_after") or 2 ** attempt, 10))
            continue
        return res
    return res
