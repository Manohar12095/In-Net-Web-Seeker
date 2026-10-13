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
