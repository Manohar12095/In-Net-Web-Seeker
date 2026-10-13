# In Net Web Seeker

**Collect. Analyze. Explore.**

*Powered by IN NET Creations · Created by S. Manohar*

A desktop platform for website intelligence, public asset collection, infrastructure analysis and offline investigation. This README is the **build plan for Google Antigravity**: the idea, the architecture, the seed code that carries the hard parts, and a prompt pack designed to build the whole app in as few tokens as possible.

> **License:** `LICENSE` is a placeholder ("All rights reserved, IN NET Creations / S. Manohar"). TODO: the owner must choose the final license.
> **Authorized use only:** collect and analyze only websites and systems you own or are explicitly permitted to test.

---

## 1. The idea in one minute

```
ONE TARGET  →  SAFE COLLECTION  →  ORGANIZED INTELLIGENCE  →  DOWNLOADABLE, VERIFIABLE PROJECT
```

Type a URL, domain or IP. The app crawls the public site inside a strict scope, downloads every reachable asset to local storage (hashed, deduplicated), maps what depends on what, gathers DNS / TLS / technology / passive-security evidence, and lets you export everything into a ZIP with a manifest and checksums. Every saved project reopens offline with zero network calls.

**Trust rules that shape every feature**

- Facts are labelled **observed**, **inferred**, **potential risk** or **unavailable**. Nothing is invented.
- GET only. No auth / CAPTCHA / paywall bypass, no exploitation, no port scanning.
- All outbound traffic goes through one SSRF-guarded HTTP client.
- Downloaded content is hostile: never executed, previewed only as escaped text or in a sandbox.

---

## 2. Feature map

| Tier | Features |
|---|---|
| **Core (the vertical slice)** | Target parser (URL / domain / IPv4 / IPv6 / batch) · same-origin async crawler (depth, page, size, budget caps, retries, cancel) · content-addressed asset store with SHA-256 and dedupe · asset explorer (virtualized table, folder tree, filters, safe preview) · projects that persist and reopen offline · **Download Everything** ZIP with `manifest.json` + `checksums.sha256` + built-in verifier |
| **Pro (intelligence)** | Network loadout graph and request waterfall · first- vs third-party breakdown · DNS (A/AAAA/CNAME/MX/NS/TXT/SOA/CAA) + RDAP · IP / ASN / reverse DNS · TLS certificate inspection · Certificate Transparency subdomains · technology fingerprints with evidence + confidence · passive findings (security headers, cookies, CORS, SPF/DMARC, directory indexes) · snapshots and diff · desktop and mobile screenshots · HTML and PDF reports |
| **Wow extras** | `Ctrl/Cmd+K` command palette · batch target queue · collection profiles (Conservative / Standard / Deep) · HAR export of observed requests · sitemap and link-graph explorer · source-map discovery · secret-pattern hints in public JS (always redacted, "review needed", never exploited) · security-header scorecard with remediation text · storage-budget meter · audit log · standalone Tools menu (Target Validator, DNS Lookup, TLS Inspector, Header Inspector, Hash Calculator, Manifest Verifier) · optional AI assistant (off by default, local-model adapter, project data never leaves the machine without consent) · provider plugins (VirusTotal, Shodan, SecurityTrails; keys in the OS keychain) |

---

## 3. Architecture

```
┌────────────── Tauri 2 shell (Rust) ──────────────┐
│  React UI  ◄── invoke("api_info") ── port + token │
│  save_export  (native save dialog, id-only)       │
│  launches + kills the Python sidecar              │
└───────────────────────┬───────────────────────────┘
                        │ HTTP on 127.0.0.1:<random port>
                        │ Authorization: Bearer <per-launch token>   (SSE for live events)
              ┌─────────▼──────────┐
              │  Python 3.12 engine│  FastAPI · asyncio crawler · SSRF-guarded httpx
              │  intelligence/     │  DNS · RDAP · TLS · tech · findings
              │  exporter          │  streaming ZIP · manifest · verify
              └───┬────────────┬───┘
         SQLite (metadata)   Filesystem  content/<sha256[:2]>/<sha256>
```

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (Rust) with minimal capabilities |
| UI | React, TypeScript, Vite, Tailwind, shadcn/ui, Lucide, TanStack Table + Virtual + Query, Zustand, Recharts, **React Flow** (graph: easiest React integration with node detail panels; switch to Cytoscape only if graphs exceed a few thousand nodes) |
| Fonts | Bundled locally via `@fontsource/*` (no CDN, works offline) |
| Engine | FastAPI, Uvicorn, HTTPX, lxml, SQLAlchemy 2, Pydantic v2, dnspython, cryptography, Playwright (Phase 4+) |
| Packaging | PyInstaller single executable shipped as a Tauri sidecar |

**Why content-addressed storage:** files are saved as `content/ab/abcdef…` (named by their SHA-256). Duplicates collapse for free, and server-supplied filenames never touch the filesystem, which removes path traversal by design.

**Layout** (kept compact; the Tauri template's `src/` is the frontend):

```
in-net-web-seeker/
  README.md  LICENSE  .env.example  .agent/rules/webseeker.md
  docs/  MASTER_PROMPT.md  PROGRESS.md
  src/                    React app (features/home, assets, loadouts, exports, …)
  src-tauri/              Rust shell, capabilities, binaries/ (sidecar)
  backend/src/webseeker/  target_parser · ssrf · downloader · crawler · db · exporter · main · __main__
                          intelligence/ (dns, rdap, tls, tech, findings)
  backend/tests/
  fixtures/server.py      local test website
  scripts/                doctor, build_sidecar.py
```

---

## 4. Token-lean build strategy (read before opening Antigravity)

The full master prompt is 838 lines. Re-sending it to every agent conversation is the single biggest waste. This plan avoids that.

| Technique | How |
|---|---|
| **Keep the master prompt on disk, not in chat** | Save it as `docs/MASTER_PROMPT.md`. Agents read only the section a task names (e.g. "§7"). |
| **Always-on rules file (about 15 lines)** | Put the rules in §5 below into `.agent/rules/webseeker.md` (or your version's equivalent). It replaces re-explaining safety and architecture. |
| **Seed the hard parts** | §8 contains the SSRF guard, streaming downloader, crawler, DB, API, exporter and sidecar. The agent *copies and wires* them. Copying costs a fraction of designing, writing and debugging the same code. |
| **Scaffold with CLIs, not agents** | §6 uses `create-tauri-app`, `uv`, `shadcn add`. Zero tokens for boilerplate. |
| **One phase = one conversation** | Start fresh per phase. `docs/PROGRESS.md` (30 lines max) is the handoff, so no long history is carried. |
| **Planning mode only where it pays** | Use it for Phase 1 and Phase 8. Use Fast mode for UI wiring, tables and tests. If your version lets you pick a model per conversation, use a cheaper one for scaffolding and tests and the strongest one for Phase 2 and Phase 8. |
| **Patches, not rewrites** | Rule: edit with small diffs; never regenerate a file. |
| **Targeted tests** | Run only the tests for the changed area; run the full suite once at phase end. |
| **One screenshot per phase** | 1366×768 only, saved as an artifact. |
| **Skip the TypeScript parser mirror at first** | Live validation calls the engine's `/api/targets/validate` (150 ms debounce). One parser, no drift, half the tests. Add a TS mirror later only if latency is noticeable. |
| **PDF reports via Playwright** | Phase 4 already installs Chromium. Render the HTML report and call `page.pdf()`. No extra PDF library, no WeasyPrint system dependencies on Windows. |
| **Alembic later** | Use `create_all` until the schema settles (Phase 6), then generate one baseline migration. |
| **Do not re-paste the wave background** | Copy `WaveBackground` verbatim from `docs/MASTER_PROMPT.md` §7.3. |

---

## 5. Always-on rules (`.agent/rules/webseeker.md`)

```markdown
# In Net Web Seeker: always-on rules (full spec: docs/MASTER_PROMPT.md, read only the section a task names)
- Brand: In Net Web Seeker · Powered by IN NET Creations · Created by S. Manohar. Never use the name "WebScope".
- Stack: Tauri 2 + React/TS/Vite/Tailwind/shadcn (src/), Python 3.12 FastAPI engine (backend/src/webseeker), SQLite + SQLAlchemy, Playwright from Phase 4.
- Engine binds 127.0.0.1, bearer token on every route, IDs never filesystem paths.
- ALL outbound HTTP goes through ssrf.make_client(). Never create a bare httpx client. GET only.
- Stream downloads to disk, content-addressed by SHA-256. Never buffer whole bodies. Never trust server filenames or MIME.
- Never fabricate data. Missing = explicit "unavailable". Label observed / inferred / potential risk.
- No auth, CAPTCHA or paywall bypass. No exploitation, port scans or state-changing requests.
- Preview untrusted content only as escaped text or in a sandboxed iframe (sandbox="" + DOMPurify for SVG).
- Edit with small patches. Do not regenerate seed files from README §8 unless a test fails.
- Run only tests for the area you changed; run everything once at phase end.
- Phase end: update docs/PROGRESS.md (30 lines max: built / tested / failed / next) and stop.
```

---

## 6. Setup (about 10 minutes, zero agent tokens)

**Prerequisites:** Node 20+, Rust (stable), [uv](https://docs.astral.sh/uv/) (installs Python 3.12), Git.
**Windows:** Visual Studio Build Tools (C++) and WebView2. **Linux:** `webkit2gtk-4.1` and build essentials ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

```bash
# 1. Desktop shell + UI  (choose TypeScript + React; identifier com.innetcreations.webseeker)
npm create tauri-app@latest in-net-web-seeker
cd in-net-web-seeker

# 2. Python engine
uv init --package --name webseeker backend
cd backend && uv python pin 3.12
uv add fastapi uvicorn httpx lxml beautifulsoup4 sqlalchemy alembic pydantic dnspython cryptography jinja2
uv add --dev pytest pytest-asyncio pyinstaller
cd ..

# 3. Frontend dependencies and UI kit
npm i tailwindcss @tailwindcss/vite @tanstack/react-query @tanstack/react-table @tanstack/react-virtual \
      zustand @xyflow/react recharts lucide-react dompurify @tauri-apps/plugin-dialog \
      @fontsource/ibm-plex-sans @fontsource/space-grotesk @fontsource/jetbrains-mono
npm i -D concurrently vitest @testing-library/react
npx shadcn@latest init
npx shadcn@latest add button input badge table tabs dialog command sonner

# 4. Rust plugins
cd src-tauri && cargo add tauri-plugin-shell tauri-plugin-dialog && cargo add uuid --features v4 && cd ..

# 5. Put the master prompt and rules in place
mkdir -p docs .agent/rules fixtures scripts
#   docs/MASTER_PROMPT.md   ← your uploaded IN_NET_WEB_SEEKER_ANTIGRAVITY_MASTER_PROMPT.md
#   .agent/rules/webseeker.md ← §5 above
```

Add to `package.json` scripts:

```json
"engine":   "cd backend && uv run python -m webseeker --dev --allow-private --port 8765 --data-dir ../.dev-data",
"fixtures": "python fixtures/server.py 9001",
"dev:all":  "concurrently -k -n engine,app \"npm run engine\" \"npm run tauri dev\"",
"test":     "vitest run && cd backend && uv run pytest -q && cd ../src-tauri && cargo test"
```

Add to `backend/pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

Later (Phase 4): `cd backend && uv add playwright && uv run playwright install chromium`.

---

## 7. Phase plan and exit checks

| Phase | Deliverable | Seed code | Exit check |
|---|---|---|---|
| **1 Foundation + Home** | App shell, design tokens, Home page (animated waves, target box, chips, features, footer), validation, one-time authorized-use dialog, project creation, token-secured engine | 8.1, 8.5, 8.6, 8.8, 8.9 | Type a target → live validation → Start → dialog → New Collection pre-filled → project survives restart |
| **2 Collection engine** | Crawler, job states, SSE live screen, cancel, DNS + RDAP | 8.2, 8.3, 8.4, 8.10 | Fixture site crawled; real statuses; cancel works; SSRF redirect blocked |
| **3 Asset explorer** | Virtualized table, tree, filters, duplicates, safe previews, retry failed | n/a | Hashes and statuses match the fixture; hostile SVG renders inert |
| **4 Loadouts** | Playwright collector (with SSRF route interception), graph, waterfall, screenshots | n/a | JS-rendered fixture shows observed dependencies and external origins |
| **5 Intelligence** | TLS, header audit, SPF/DMARC, CT subdomains, tech fingerprints, passive findings | n/a | Each module shows sourced data or an explicit "unavailable" |
| **6 Download Everything** | Export UI, HTML + PDF report, verifier UI, cancel, Alembic baseline | 8.7 | Export → extract → verifier passes; tampered file is flagged |
| **7 Snapshots + offline** | Snapshot diff by hash, offline mode, interrupted-job recovery | n/a | Project opens with zero sockets opened; two snapshots diff correctly |
| **8 Harden + release** | SSRF/zip regression tests, accessibility pass, installers | `build_sidecar.py` | `npm run tauri build` succeeds on Windows and Linux; known limitations documented |

---

## 8. Seed code (the important parts)

> These files have **not been executed yet**. Phase 1 and 2 tasks are to run the tests below and fix whatever breaks (library versions, especially `httpcore` and the Tauri plugins, may need small adjustments).

### 8.1 `backend/src/webseeker/target_parser.py`

Source of truth for validation. No network access.

```python
from __future__ import annotations
import ipaddress, re
from dataclasses import dataclass, field
from urllib.parse import urlsplit

ALLOWED_SCHEMES = {"http", "https"}
DEFAULT_PORT = {"http": 80, "https": 443}
_BAD_SCHEME = re.compile(r"^(javascript|data|file|ftp|mailto|ws|wss|gopher):", re.I)
_SCHEME = re.compile(r"^([a-z][a-z0-9+.-]*)://", re.I)
PRIVATE_MSG = ("Private and internal addresses are blocked by default. "
               "You can review this in Settings → Privacy and security.")


@dataclass
class ParsedTarget:
    input: str
    kind: str = "invalid"            # url | domain | ipv4 | ipv6 | hostname | invalid
    normalized: str = ""
    host: str = ""
    port: int | None = None
    scheme: str = ""
    ip_family: int | None = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    modules: list[str] = field(default_factory=list)


def parse_target(raw: str) -> ParsedTarget:
    t = ParsedTarget(input=raw)
    s = (raw or "").strip()
    if not s:
        t.errors.append("Empty input")
        return t
    if _BAD_SCHEME.match(s):
        t.errors.append(f"Unsupported scheme: {s.split(':', 1)[0].lower()}:")
        return t
    m = _SCHEME.match(s)
    if m:
        if m.group(1).lower() not in ALLOWED_SCHEMES:
            t.errors.append(f"Unsupported scheme: {m.group(1).lower()}://")
            return t
    else:
        try:                                   # bare IPv6, e.g. 2001:db8::1
            if ipaddress.ip_address(s).version == 6:
                s = f"[{s}]"
        except ValueError:
            pass
        s = "https://" + s
    try:
        p = urlsplit(s)
        host, port = p.hostname, p.port
    except ValueError:
        t.errors.append("Invalid URL, IPv6 address or port")
        return t
    if not host:
        t.errors.append("Missing host")
        return t
    if p.username or p.password:
        t.warnings.append("Embedded credentials were removed")
    if p.fragment:
        t.warnings.append("URL fragment was removed")

    try:
        ip = ipaddress.ip_address(host)
        host_kind, t.ip_family = ("ipv6" if ip.version == 6 else "ipv4"), ip.version
        hostpart = f"[{ip.compressed}]" if ip.version == 6 else str(ip)
        if not ip.is_global:
            t.warnings.append(PRIVATE_MSG)
        t.modules = ["http", "tls", "ip", "reverse_dns"]
    except ValueError:                         # not an IP literal → domain / hostname
        try:
            host = host.rstrip(".").encode("idna").decode("ascii")
        except UnicodeError:
            t.errors.append("Invalid domain name")
            return t
        host_kind = "domain" if "." in host else "hostname"
        hostpart = host
        t.modules = ["http", "dns", "rdap", "tls", "technologies", "security"]
        # Odd encodings such as 2130706433 land here; ssrf.resolve_public() blocks them after DNS resolution.

    t.scheme = p.scheme
    t.host = host
    t.port = port or DEFAULT_PORT[p.scheme]
    t.kind = "url" if m else host_kind
    if t.port not in (80, 443):
        t.warnings.append(f"Non-standard port {t.port} may be restricted by policy")
    netloc = hostpart + (f":{port}" if port and port != DEFAULT_PORT[p.scheme] else "")
    t.normalized = f"{p.scheme}://{netloc}{p.path or '/'}" + (f"?{p.query}" if p.query else "")
    return t
```

### 8.2 `backend/src/webseeker/ssrf.py`

One guarded HTTP client for the whole app. It resolves DNS itself, validates the IP, then connects to that exact IP (defeats DNS rebinding). Redirects are *not* followed here; the downloader revalidates every hop.

```python
import asyncio, ipaddress, os, socket
import httpcore, httpx

ALLOW_PRIVATE = os.getenv("WEBSEEKER_ALLOW_PRIVATE") == "1"   # fixtures/tests only; the Tauri shell never sets it
ALLOWED_PORTS = {80, 443, 8080, 8443}
BLOCKED_NAMES = {"localhost", "metadata.google.internal"}
METADATA = {ipaddress.ip_address(x) for x in ("169.254.169.254", "fd00:ec2::254", "100.100.100.200")}
UA = "InNetWebSeeker/0.1 (local desktop collector)"


class BlockedDestination(Exception):
    pass


def check_ip(ip, allow_private: bool = False) -> None:
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    if ip in METADATA or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
        raise BlockedDestination(f"{ip} is always blocked")
    if not allow_private and not ip.is_global:
        raise BlockedDestination(f"{ip} is a private or reserved address")


async def resolve_public(host: str, port: int) -> list[str]:
    name = host.lower().rstrip(".")
    if not ALLOW_PRIVATE:
        if name in BLOCKED_NAMES or name.endswith(".localhost"):
            raise BlockedDestination(f"{host} is blocked")
        if port not in ALLOWED_PORTS:
            raise BlockedDestination(f"port {port} is not allowed")
    infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    ips = []
    for *_, sockaddr in infos:
        ip = ipaddress.ip_address(sockaddr[0].split("%")[0])
        check_ip(ip, ALLOW_PRIVATE)
        ips.append(str(ip))
    if not ips:
        raise BlockedDestination(f"{host} did not resolve")
    return ips


class GuardedBackend(httpcore.AsyncNetworkBackend):
    """Resolve + validate, then connect to the validated IP. TLS still verifies the original hostname."""

    def __init__(self) -> None:
        self._inner = httpcore.AnyIOBackend()

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        ip = (await resolve_public(host, port))[0]
        return await self._inner.connect_tcp(ip, port, timeout=timeout,
                                             local_address=local_address, socket_options=socket_options)

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise BlockedDestination("unix sockets are disabled")

    async def sleep(self, seconds: float) -> None:
        await self._inner.sleep(seconds)


def make_client(timeout: float = 15.0) -> httpx.AsyncClient:
    transport = httpx.AsyncHTTPTransport()
    # Swaps in the guarded pool. Relies on httpx internals: pin versions and keep the rebinding regression test.
    transport._pool = httpcore.AsyncConnectionPool(
        ssl_context=httpx.create_ssl_context(), max_connections=20, network_backend=GuardedBackend())
    return httpx.AsyncClient(transport=transport, follow_redirects=False, timeout=timeout,
                             trust_env=False, headers={"User-Agent": UA})
```

### 8.3 `backend/src/webseeker/downloader.py`

Streams to a temp file, hashes while streaming, caps decoded size (also stops decompression bombs), revalidates every redirect hop, finalizes atomically.

```python
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
```

### 8.4 `backend/src/webseeker/crawler.py`

Same-origin BFS with a worker pool. External URLs are *recorded* as dependencies, never fetched.

```python
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
```

### 8.5 `backend/src/webseeker/db.py`

SQLite for metadata, filesystem for bytes. (Sync SQLAlchemy is fine for this write rate; wrap in `asyncio.to_thread` if profiling shows event-loop stalls.)

```python
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, Text, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


def _id() -> str: return uuid.uuid4().hex
def _now(): return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "project"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(200))
    target: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Run(Base):
    __tablename__ = "run"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="running")
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Resource(Base):
    __tablename__ = "resource"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(Text)
    final_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16))        # ok | http_error | skipped | blocked | too_large | error
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime: Mapped[str | None] = mapped_column(String(100), nullable=True)
    detected: Mapped[str | None] = mapped_column(String(32), nullable=True)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class Event(Base):
    __tablename__ = "event"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(24))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


engine = None


def init(data_dir: Path) -> None:
    global engine
    data_dir.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{data_dir / 'webseeker.db'}")

    @event.listens_for(engine, "connect")
    def _pragmas(conn, _):
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()

    Base.metadata.create_all(engine)       # Phase 6: replace with an Alembic baseline migration


def create_project(name: str, target: str) -> dict:
    with Session(engine) as s, s.begin():
        p = Project(name=name, target=target)
        s.add(p)
        s.flush()
        return {"id": p.id, "name": p.name, "target": p.target}


def list_projects() -> list[dict]:
    with Session(engine) as s:
        rows = s.scalars(select(Project).order_by(Project.created_at.desc())).all()
        return [{"id": p.id, "name": p.name, "target": p.target, "created_at": p.created_at.isoformat()} for p in rows]


def create_run(project_id: str, config: dict) -> str:
    with Session(engine) as s, s.begin():
        r = Run(project_id=project_id, config=config)
        s.add(r)
        s.flush()
        return r.id


def finish_run(run_id: str, status: str) -> None:
    with Session(engine) as s, s.begin():
        r = s.get(Run, run_id)
        r.status, r.finished_at = status, _now()


def save_event(run_id: str, kind: str, d: dict) -> None:
    with Session(engine) as s, s.begin():
        if kind == "resource":
            s.add(Resource(run_id=run_id, url=d["url"], final_url=d.get("final_url"), referrer=d.get("referrer"),
                           depth=d.get("depth", 0), status=d["status"], http_status=d.get("http_status"),
                           mime=d.get("mime"), detected=d.get("detected"), size=d.get("bytes", 0),
                           sha256=d.get("sha256"), error=d.get("error")))
        else:
            s.add(Event(run_id=run_id, kind=kind, data=d))


def resources_for_project(project_id: str) -> list[dict]:
    q = (select(Resource).join(Run, Resource.run_id == Run.id)
         .where(Run.project_id == project_id, Resource.status == "ok"))
    with Session(engine) as s:
        return [{"url": r.url, "mime": r.mime, "size": r.size, "sha256": r.sha256, "detected": r.detected}
                for r in s.scalars(q)]
```

### 8.6 `backend/src/webseeker/main.py` and `__main__.py`

Token-secured local API with SSE live events and cancel. IDs only; the API never accepts a filesystem path.

```python
# main.py
import asyncio, json, os, secrets, uuid
from dataclasses import asdict
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import db
from .crawler import Crawler, Limits
from .exporter import export_project
from .ssrf import make_client
from .target_parser import parse_target

TOKEN = os.environ.get("WEBSEEKER_TOKEN", "")
DATA = Path(os.environ.get("WEBSEEKER_DATA", "./data"))
db.init(DATA)


def auth(authorization: str = Header(default="")):
    if not TOKEN or not secrets.compare_digest(authorization, f"Bearer {TOKEN}"):
        raise HTTPException(401, {"code": "unauthorized", "message": "Missing or invalid token", "retryable": False})


app = FastAPI(title="In Net Web Seeker engine", dependencies=[Depends(auth)])
app.add_middleware(CORSMiddleware, allow_headers=["*"], allow_methods=["*"],
                   allow_origins=["tauri://localhost", "http://tauri.localhost",
                                  "http://localhost:1420", "http://localhost:5173"])


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
def health(): return {"ok": True}


@app.get("/api/targets/validate")
def validate(input: str): return asdict(parse_target(input))


@app.get("/api/projects")
def projects(): return db.list_projects()


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
        raise HTTPException(404, {"code": "not_found", "message": "Unknown run", "retryable": False})

    async def gen():
        while True:
            ev = await job.q.get()
            yield f"data: {json.dumps(ev)}\n\n"
            if ev["type"] == "end":
                break
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/collections/{run_id}/cancel")
def cancel(run_id: str):
    job = JOBS.get(run_id)
    if not job or not job.crawler:
        raise HTTPException(404, {"code": "not_found", "message": "No active run", "retryable": False})
    job.crawler.cancel.set()
    return {"ok": True}


@app.post("/api/projects/{pid}/exports")
async def make_export(pid: str):
    export_id = uuid.uuid4().hex
    dest = DATA / "exports" / f"{export_id}.zip"       # Rust save_export() copies this by ID
    dest.parent.mkdir(parents=True, exist_ok=True)
    proj = next((p for p in db.list_projects() if p["id"] == pid), None)
    if not proj:
        raise HTTPException(404, {"code": "not_found", "message": "Unknown project", "retryable": False})
    host = parse_target(proj["target"]).host or "target"
    rows = db.resources_for_project(pid)
    info = await asyncio.to_thread(export_project, rows, DATA / "projects" / pid, dest,
                                   {"host": host, "target": proj["target"], "project_id": pid, "export_id": export_id})
    return {"export_id": export_id, **info}
```

```python
# __main__.py  (absolute imports so PyInstaller works)
import argparse, os


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, required=True)
    ap.add_argument("--data-dir", required=True)
    ap.add_argument("--dev", action="store_true")             # dev token; only used by `npm run engine`
    ap.add_argument("--allow-private", action="store_true")   # local fixtures only
    a = ap.parse_args()
    os.environ["WEBSEEKER_DATA"] = a.data_dir
    if a.dev:
        os.environ.setdefault("WEBSEEKER_TOKEN", "dev-token")
    if a.allow_private:
        os.environ["WEBSEEKER_ALLOW_PRIVATE"] = "1"
    import uvicorn
    from webseeker.main import app
    uvicorn.run(app, host="127.0.0.1", port=a.port, log_level="warning")


if __name__ == "__main__":
    main()
```

### 8.7 `backend/src/webseeker/exporter.py`

Streams files from disk into the ZIP, writes the manifest and checksums, then **re-opens and verifies the archive before reporting success**.

```python
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
                            "size": r["size"], "sha256": r["sha256"]})
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
```

### 8.8 Tauri shell: `src-tauri/src/lib.rs`

Picks a free port, generates a per-launch token, launches the sidecar, hands `{port, token}` to the UI, saves exports through a native dialog **by ID only**, and kills the engine on exit. In debug builds it uses the dev engine from `npm run engine`.

```rust
use std::{net::TcpListener, sync::Mutex};
use tauri::{Manager, RunEvent, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};

struct Api { port: u16, token: String }
struct Engine(Mutex<Option<CommandChild>>);

#[tauri::command]
fn api_info(api: State<'_, Api>) -> (u16, String) { (api.port, api.token.clone()) }

#[tauri::command]
async fn save_export(app: tauri::AppHandle, export_id: String) -> Result<Option<String>, String> {
    if export_id.len() != 32 || !export_id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("invalid export id".into());
    }
    let src = app.path().app_data_dir().map_err(|e| e.to_string())?
        .join("exports").join(format!("{export_id}.zip"));
    let Some(dest) = app.dialog().file().add_filter("ZIP archive", &["zip"])
        .set_file_name("web-seeker-export.zip").blocking_save_file() else { return Ok(None) };
    let dest = dest.into_path().map_err(|e| e.to_string())?;
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(Some(dest.display().to_string()))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let (port, token, child) = if cfg!(debug_assertions) {
                (8765u16, "dev-token".to_string(), None)            // dev: `npm run engine` runs the API
            } else {
                let port = TcpListener::bind("127.0.0.1:0")?.local_addr()?.port();
                let token = format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple());
                let (mut rx, child) = app.shell().sidecar("webseeker-engine")?
                    .env("WEBSEEKER_TOKEN", &token)
                    .args(vec!["--port".to_string(), port.to_string(),
                               "--data-dir".to_string(), data_dir.to_string_lossy().to_string()])
                    .spawn()?;
                tauri::async_runtime::spawn(async move {
                    while let Some(ev) = rx.recv().await {
                        if let CommandEvent::Stderr(l) = ev { eprintln!("[engine] {}", String::from_utf8_lossy(&l)); }
                    }
                });
                (port, token, Some(child))
            };
            app.manage(Api { port, token });
            app.manage(Engine(Mutex::new(child)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![api_info, save_export])
        .build(tauri::generate_context!())
        .expect("failed to build In Net Web Seeker")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(c) = app.state::<Engine>().0.lock().unwrap().take() { let _ = c.kill(); }
            }
        });
}
```

`src-tauri/tauri.conf.json` (relevant parts):

```json
{
  "productName": "In Net Web Seeker",
  "identifier": "com.innetcreations.webseeker",
  "bundle": { "publisher": "IN NET Creations", "externalBin": ["binaries/webseeker-engine"] },
  "app": { "windows": [{ "title": "In Net Web Seeker", "label": "main" }] }
}
```

`src-tauri/capabilities/default.json` (adjust identifiers to your plugin versions):

```json
{
  "identifier": "main",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-save",
    { "identifier": "shell:allow-spawn", "allow": [{ "name": "binaries/webseeker-engine", "sidecar": true, "args": true }] }
  ]
}
```

`scripts/build_sidecar.py` (Tauri needs the binary named with the Rust target triple):

```python
import pathlib, shutil, subprocess, sys
triple = next(l.split(": ")[1] for l in subprocess.check_output(["rustc", "-vV"], text=True).splitlines()
              if l.startswith("host:"))
ext = ".exe" if sys.platform == "win32" else ""
subprocess.check_call(["uv", "run", "pyinstaller", "--onefile", "--name", "webseeker-engine",
                       "src/webseeker/__main__.py"], cwd="backend")
dst = pathlib.Path("src-tauri/binaries"); dst.mkdir(parents=True, exist_ok=True)
shutil.copy(f"backend/dist/webseeker-engine{ext}", dst / f"webseeker-engine-{triple}{ext}")
```

### 8.9 Frontend: `src/lib/api.ts` and the Home validation hook

```ts
// src/lib/api.ts
import { invoke } from "@tauri-apps/api/core";

type Cfg = { base: string; token: string };
let cfg: Promise<Cfg> | undefined;

export function apiConfig(): Promise<Cfg> {
  cfg ??= (async () => {
    if ("__TAURI_INTERNALS__" in window) {
      const [port, token] = await invoke<[number, string]>("api_info");
      return { base: `http://127.0.0.1:${port}`, token };
    }
    return { base: import.meta.env.VITE_DEV_API ?? "http://127.0.0.1:8765",
             token: import.meta.env.VITE_DEV_TOKEN ?? "dev-token" };   // browser-only dev
  })();
  return cfg;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, token } = await apiConfig();
  const r = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!r.ok) throw (await r.json()).detail ?? { code: "http_error", message: r.statusText, retryable: true };
  return r.json();
}

// EventSource cannot send an Authorization header, so stream with fetch.
export async function* sse<T = any>(path: string, signal?: AbortSignal): AsyncGenerator<T> {
  const { base, token } = await apiConfig();
  const r = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` }, signal });
  const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).split("\n").find((l) => l.startsWith("data: "));
      buf = buf.slice(i + 2);
      if (line) yield JSON.parse(line.slice(6)) as T;
    }
  }
}
```

```ts
// src/features/home/useTargetValidation.ts
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Parsed = {
  kind: string; normalized: string; host: string; warnings: string[]; errors: string[]; modules: string[];
};

export function useTargetValidation(input: string): Parsed | null {
  const [res, setRes] = useState<Parsed | null>(null);
  useEffect(() => {
    if (!input.trim()) { setRes(null); return; }          // calm until the user types
    let alive = true;
    const t = setTimeout(() => {
      api<Parsed>(`/api/targets/validate?input=${encodeURIComponent(input)}`)
        .then((p) => alive && setRes(p)).catch(() => {});
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [input]);
  return res;
}
```

For the animated Home background, copy `WaveBackground.tsx` verbatim from `docs/MASTER_PROMPT.md` §7.3 and test reduced-motion.

### 8.10 Fixture site and tests

```python
# fixtures/server.py   ·   python fixtures/server.py 9001
import sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HTML = b"""<!doctype html><title>Fixture</title><link rel=stylesheet href="/app.css">
<script src="/app.js"></script><img src="/logo.svg"><a href="/about">about</a>
<a href="/redir">redir</a><a href="/loop">loop</a><a href="/big.bin">big</a>
<a href="/limited">429</a><a href="/to-metadata">metadata</a>"""
ROUTES = {
    "/": ("text/html", HTML),
    "/about": ("text/html", b"<title>About</title><a href='/'>home</a>"),
    "/app.css": ("text/css", b"@import '/extra.css'; body{background:url(/logo.svg)}"),
    "/extra.css": ("text/css", b"h1{color:red}"),
    "/app.js": ("text/javascript", b"console.log('hi')"),
    "/logo.svg": ("image/svg+xml", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"),
}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, ctype, body, headers=()):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = self.path.split("?")[0]
        if p in ROUTES:       return self._send(200, *ROUTES[p])
        if p == "/redir":     return self._send(302, "text/plain", b"", [("Location", "/about")])
        if p == "/loop":      return self._send(302, "text/plain", b"", [("Location", "/loop")])
        if p == "/to-metadata": return self._send(302, "text/plain", b"", [("Location", "http://169.254.169.254/latest/meta-data/")])
        if p == "/limited":   return self._send(429, "text/plain", b"slow down", [("Retry-After", "1")])
        if p == "/slow":      time.sleep(20); return self._send(200, "text/plain", b"late")
        if p == "/big.bin":   return self._send(200, "application/octet-stream", b"0" * 30_000_000)
        self._send(404, "text/plain", b"nope")


ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9001), H).serve_forever()
```

```python
# backend/tests/test_core.py
import ipaddress, subprocess, sys, time
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from webseeker import ssrf
from webseeker.crawler import Crawler, Limits
from webseeker.exporter import export_project, verify_zip
from webseeker.target_parser import parse_target

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("raw,kind,ok", [
    ("example.com", "domain", True), ("https://example.com/a?b=1#c", "url", True),
    ("8.8.8.8", "ipv4", True), ("2001:db8::1", "ipv6", True),
    ("file:///etc/passwd", "invalid", False), ("javascript:alert(1)", "invalid", False), ("", "invalid", False),
])
def test_parser(raw, kind, ok):
    t = parse_target(raw)
    assert t.kind == kind and (not t.errors) == ok


def test_private_ip_warning():
    assert any("blocked by default" in w for w in parse_target("192.168.1.1").warnings)


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.5", "169.254.169.254", "::1", "::ffff:127.0.0.1", "fd00::1", "0.0.0.0"])
def test_ssrf_blocks(ip):
    with pytest.raises(ssrf.BlockedDestination):
        ssrf.check_ip(ipaddress.ip_address(ip), allow_private=False)


@pytest.fixture(scope="module")
def site():
    p = subprocess.Popen([sys.executable, str(ROOT / "fixtures" / "server.py"), "9001"])
    time.sleep(0.7)
    yield "http://127.0.0.1:9001/"
    p.terminate()


async def test_crawl_export_verify(tmp_path, site, monkeypatch):
    monkeypatch.setattr(ssrf, "ALLOW_PRIVATE", True)         # fixture lives on loopback
    rows: list[dict] = []

    async def emit(kind, data):
        if kind == "resource":
            rows.append(data)

    async with ssrf.make_client(timeout=3) as client:
        await Crawler(client, site, Limits(depth=1, max_file=5_000_000), tmp_path, emit).run(site)

    ok = [r for r in rows if r["status"] == "ok"]
    assert {"/", "/about", "/app.css", "/extra.css", "/app.js", "/logo.svg"} <= {urlsplit(r["url"]).path for r in ok}
    by = {urlsplit(r["url"]).path: r["status"] for r in rows}
    assert by["/big.bin"] == "too_large"
    assert by["/to-metadata"] in {"skipped", "blocked"}      # redirect to the metadata IP is never followed
    dest = tmp_path / "out.zip"
    export_project(ok, tmp_path, dest, {"host": "127.0.0.1", "target": site, "project_id": "p", "export_id": "e"})
    assert verify_zip(dest) == (True, [])
```

Add later (Phase 8): a DNS-rebinding test (resolver returns a public IP on first call and `127.0.0.1` on the second), a zip-slip test, a corrupted-manifest test and a "zero sockets while opening a saved project" test.

---

## 9. Antigravity prompt pack

Open each prompt in a **fresh conversation**. Prompts are deliberately short because the rules file, `docs/MASTER_PROMPT.md` and this README already hold the detail.

**Phase 1: Foundation + Home** *(Planning mode)*
```
Read docs/MASTER_PROMPT.md §1, §6, §7 and README §8.1, 8.5, 8.6, 8.8, 8.9 only.
1. Create the seed files from README §8 exactly as written; run `uv run pytest -q` and fix only real failures.
2. Apply design tokens (§6) and the shadcn kit. Add the Space Grotesk / IBM Plex Sans / JetBrains Mono fonts locally.
3. Build the app shell (top bar, sidebar, project selector, Ctrl+K palette) and the Home page exactly per §7, copying WaveBackground from §7.3.
4. Flow: Home → one-time authorized-use dialog (stored once in the DB) → New Collection pre-filled → create project → shows as a Recent chip after restart.
Do not build any other screen. Finish with: tests green, one 1366×768 screenshot, PROGRESS.md update.
```

**Phase 2: Collection engine + live screen**
```
Read README §8.2, 8.3, 8.4, 8.10 and MASTER_PROMPT §10.
Add the seed files, wire the crawler to POST /api/collections and the SSE stream, and build the Live Collection screen
(real counters only, indeterminate progress, Cancel, expandable event log). Add dnspython A/AAAA/NS/MX/TXT and an RDAP lookup
with an explicit "unavailable" state. Run test_core.py against the fixture. Update PROGRESS.md.
```

**Phase 3: Asset explorer**
```
Read MASTER_PROMPT §11 (asset browser + safe previews). Build a virtualized TanStack table with filters
(type, status, size, origin), a folder tree, duplicate groups by sha256, and a preview pane: images, escaped text/JSON/CSV/source,
SVG via DOMPurify inside <iframe sandbox="">, PDF in a sandboxed iframe. Add "retry failed". Test with the hostile fixture SVG.
```

**Phase 4: Loadouts + screenshots**
```
Read MASTER_PROMPT §12, §15. Add Playwright (uv add playwright; install chromium). Intercept every browser request and run it
through ssrf.resolve_public. Record observed requests, build a React Flow dependency graph, a request waterfall,
first- vs third-party breakdown and desktop/mobile screenshots. Add a JS-rendered fixture page and a test.
```

**Phase 5: Intelligence + passive findings**
```
Read MASTER_PROMPT §13, §14. Add TLS inspection (ssl + cryptography), HTTP header/cookie/CORS audit, SPF/DKIM/DMARC via DNS,
Certificate Transparency subdomains, and a JSON rule file of about 60 technology signatures. Every record stores source, timestamp, confidence,
or an explicit "unavailable". Findings are passive, evidence-linked, never claim a vulnerability from a fingerprint alone.
```

**Phase 6: Download Everything + reports**
```
Read README §8.7 and MASTER_PROMPT §17. Build the export-selection UI, progress and cancel, the Verify export screen (verify_zip),
the Rust save_export call, and an HTML report with the credits footer; render the PDF from that HTML with Playwright page.pdf().
Generate one Alembic baseline migration. Test: export → extract → verify passes; edit one file → verify fails.
```

**Phase 7: Snapshots + offline**
```
Read MASTER_PROMPT §15, §18. Re-collection creates a snapshot. Diff by sha256: new/removed/changed pages and assets, new external
origins, header and certificate changes. Offline mode: opening a project makes zero network calls (add a test that fails on any socket connect).
Mark every record "cached locally" or "needs online lookup". Add interrupted-run recovery and a tmp/ sweep on startup.
```

**Phase 8: Harden + release**
```
Read MASTER_PROMPT §21, §22, §27. Add regression tests: SSRF (IPv4/IPv6/mapped/encoded/rebinding/redirects), zip-slip, oversized and malformed
responses, cancellation, interrupted export, corrupted manifest. Accessibility pass (keyboard, focus, contrast). Fill docs/security.md and
troubleshooting.md. Run scripts/build_sidecar.py then `npm run tauri build`. List anything not built or tested in this README under Known limitations.
```

---

## 10. Run it

```bash
npm run dev:all        # Python engine on 127.0.0.1:8765 + Tauri window (dev token, no sidecar needed)
npm run fixtures       # local test website on 127.0.0.1:9001 (the dev engine allows loopback for this)
npm test               # vitest + pytest + cargo test

python scripts/build_sidecar.py && npm run tauri build     # production installer (Windows .msi/.exe, Linux .deb/.AppImage)
```

**Troubleshooting quick hits:** blank window on Linux → install `webkit2gtk-4.1`; `401 unauthorized` in browser-only dev → set `VITE_DEV_TOKEN=dev-token`; sidecar not found in a release build → the binary must be named `webseeker-engine-<target-triple>[.exe]` (the build script does this).

---

## 11. Security model (summary)

- Engine binds `127.0.0.1`, random port, per-launch bearer token, CORS limited to the app origins. No filesystem paths accepted from the API.
- SSRF: block loopback, private, link-local, multicast, reserved, cloud-metadata (IPv4, IPv6, IPv4-mapped, odd encodings); resolve first, connect to the validated IP; revalidate every redirect hop; same rules inside Playwright.
- Files: content-addressed names, size caps on decoded bytes, atomic finalize, ZIP entries sanitized, verifier rejects unsafe paths.
- UI: strict CSP, minimal Tauri capabilities, no remote content in the privileged webview, untrusted previews sandboxed.
- Active tests (if ever added) are a separate module, off by default, behind an explicit authorization step.

## 12. Known limitations (disclose in the app too)

- Only publicly reachable resources inside the configured scope can be collected. Server-side code, private files and databases are never retrievable from a URL.
- Pages behind login, CAPTCHA or paywall are not collected or bypassed.
- Browser observation misses resources that load only after interaction, for a specific account, region or app state.
- Subdomain, DNS-history and reputation data depend on available sources and are never complete.
- IP geolocation describes a network allocation, not a person or device. Fingerprints are indicators, not proof of a version or vulnerability.
- The guarded HTTP client swaps an `httpx` transport internal; keep versions pinned and keep the DNS-rebinding test.
- Seed code in §8 is untested until Phase 1 and 2 run it. Anything unfinished at release must be listed here with the exact remaining work.

## 13. Roadmap

macOS build · WARC/HAR import · scheduled re-collection · diffing screenshots visually · local-model AI assistant · plugin marketplace for intelligence providers · i18n.

---

**In Net Web Seeker. Powered by IN NET Creations. Created by S. Manohar.**
