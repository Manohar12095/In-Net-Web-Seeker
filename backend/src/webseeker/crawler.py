import asyncio, re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlsplit

import lxml.html
from .downloader import download_retry

SKIP = ("javascript:", "mailto:", "tel:", "data:", "blob:", "#")
CSS_URL = re.compile(r"""url\(\s*['"]?([^'")\s]+)|@import\s+['"]([^'"]+)""")
LINK_XP = "//a/@href | //iframe/@src | //frame/@src"
ASSET_XP = ("//script/@src | //link/@href | //img/@src | //source/@src | //video/@src | "
            "//video/@poster | //audio/@src | //embed/@src | //object/@data")


def extract(body: bytes, base: str, mime: str) -> list[tuple[str, str]]:
    """Return [(kind, absolute_url)] where kind is 'link' or 'asset'. Respects <base>."""
    refs: list[tuple[str, str]] = []
    try:
        if "html" in mime:
            doc = lxml.html.fromstring(body)
            b = doc.xpath("//base/@href")
            base = urljoin(base, b[0]) if b else base
            refs += [("link", r) for r in doc.xpath(LINK_XP)] + [("asset", r) for r in doc.xpath(ASSET_XP)]
        elif "css" in mime:
            refs += [("asset", m[0] or m[1]) for m in CSS_URL.findall(body.decode("utf-8", "ignore"))]
    except Exception:
        return []
    out = []
    for kind, ref in refs:
        ref = ref.strip()
        if ref and not ref.lower().startswith(SKIP):
            out.append((kind, urldefrag(urljoin(base, ref)).url))
    return out


@dataclass
class Limits:
    depth: int = 2
    max_pages: int = 200
    concurrency: int = 6
    max_file: int = 25_000_000
    budget: int = 500_000_000


class Crawler:
    def __init__(self, client, origin: str, limits: Limits, store: Path, emit):
        self.client, self.lim, self.store, self.emit = client, limits, store, emit
        self.host = urlsplit(origin).netloc
        self.q: asyncio.Queue = asyncio.Queue()
        self.seen: set[str] = set()
        self.external: set[str] = set()
        self.cancel = asyncio.Event()
        self.bytes = self.pages = 0

    def in_scope(self, url: str) -> bool:
        return urlsplit(url).netloc == self.host

    def enqueue(self, url: str, depth: int, ref: str | None) -> None:
        if url in self.seen or urlsplit(url).scheme not in ("http", "https"):
            return
        self.seen.add(url)
        if self.in_scope(url):
            self.q.put_nowait((url, depth, ref))
        else:
            self.external.add(url)                    # recorded as a dependency, not fetched

    async def worker(self) -> None:
        while True:
            url, depth, ref = await self.q.get()
            try:
                if self.cancel.is_set() or self.bytes >= self.lim.budget:
                    continue
                res = await download_retry(self.client, url, self.store,
                                           max_bytes=self.lim.max_file, scope=self.in_scope)
                local = res.pop("path", None)
                res.update(url=url, depth=depth, referrer=ref)
                await self.emit("resource", res)
                self.bytes += res.get("bytes", 0)
                if res["status"] == "ok" and local:
                    mime = res.get("mime", "")
                    if "html" in mime:
                        self.pages += 1
                    if "html" in mime or "css" in mime:
                        body = Path(local).read_bytes()[:5_000_000]
                        for kind, u in extract(body, res["final_url"], mime):
                            if kind == "asset" or (depth < self.lim.depth and self.pages <= self.lim.max_pages):
                                self.enqueue(u, depth + (kind == "link"), url)
            except Exception as e:                    # never swallow silently
                await self.emit("error", {"url": url, "error": repr(e)})
            finally:
                self.q.task_done()

    async def run(self, start: str) -> None:
        self.enqueue(start, 0, None)
        workers = [asyncio.create_task(self.worker()) for _ in range(self.lim.concurrency)]
        await self.q.join()
        for w in workers:
            w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        await self.emit("summary", {"pages": self.pages, "bytes": self.bytes,
                                    "external_origins": sorted({urlsplit(u).netloc for u in self.external})})
