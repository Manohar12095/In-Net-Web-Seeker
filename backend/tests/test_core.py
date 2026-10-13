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
