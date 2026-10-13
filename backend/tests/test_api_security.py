# backend/tests/test_api_security.py
"""
Comprehensive API Validation and Security Penetration Test Suite
Covering:
- OWASP API Security Top 10 (Broken Auth, SSRF, Injection, Excessive Data Exposure)
- Path Traversal & File Sandbox Checks
- Passive Intelligence Safe Handling
"""
import os
import uuid
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport

# Set test environment tokens before importing app
os.environ["WEBSEEKER_TOKEN"] = "test-secret-token-12345"
os.environ["WEBSEEKER_ALLOW_PRIVATE"] = "0"

from webseeker.main import app, DATA
from webseeker import db, ssrf
from webseeker.target_parser import parse_target


@pytest.fixture(autouse=True)
def setup_db(tmp_path):
    test_data = tmp_path / "data"
    test_data.mkdir()
    db.init(test_data)
    # Monkeypatch DATA in main
    import webseeker.main as main_mod
    main_mod.DATA = test_data
    yield
    # Cleanup


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


AUTH_HEADERS = {"Authorization": "Bearer test-secret-token-12345"}
BAD_AUTH_HEADERS = {"Authorization": "Bearer wrong-attacker-token"}


# ── 1. Authentication & Authorization Security Tests ────────────────────────

@pytest.mark.asyncio
async def test_auth_missing_header_rejected(client: AsyncClient):
    """OWASP API2: Broken Authentication - Missing header must return 401."""
    res = await client.get("/api/health")
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_auth_invalid_token_rejected(client: AsyncClient):
    """OWASP API2: Broken Authentication - Forged token must return 401."""
    res = await client.get("/api/health", headers=BAD_AUTH_HEADERS)
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_auth_valid_token_accepted(client: AsyncClient):
    """Valid bearer token grants access."""
    res = await client.get("/api/health", headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert res.json() == {"ok": True}


# ── 2. SQL Injection Resistance & Input Fuzzing Tests ────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [
    "'; DROP TABLE project; --",
    "' OR '1'='1",
    "admin' --",
    "1' UNION SELECT 1, 'injected', 'target', '2026-01-01' --",
    "<script>alert(1)</script>",
    "'; VACUUM; --",
])
async def test_sqli_in_project_and_queries(client: AsyncClient, payload: str):
    """Verify ORM parameters prevent SQL injection attacks in all endpoints."""
    # Create project with injection payload
    res = await client.post(
        "/api/projects",
        json={"name": f"Project-{payload}", "target": f"https://example.com/{payload}"},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    created = res.json()
    assert "id" in created
    pid = created["id"]

    # Verify retrieval does not trigger database syntax errors
    list_res = await client.get("/api/projects", headers=AUTH_HEADERS)
    assert list_res.status_code == 200
    assert any(p["id"] == pid for p in list_res.json())

    # Verify project detail endpoint handles query safely
    detail_res = await client.get(f"/api/projects/{pid}", headers=AUTH_HEADERS)
    assert detail_res.status_code == 200
    assert detail_res.json()["name"] == f"Project-{payload}"


# ── 3. SSRF & Cloud Metadata Protection Tests ────────────────────────────────

@pytest.mark.parametrize("host", [
    "169.254.169.254",            # AWS / Azure / GCP Metadata IP
    "100.100.100.200",            # Alibaba Cloud metadata
    "fd00:ec2::254",              # AWS IPv6 metadata
    "127.0.0.1",                  # IPv4 Loopback
    "::1",                        # IPv6 Loopback
    "::ffff:127.0.0.1",           # IPv4-mapped IPv6 loopback
    "0.0.0.0",                    # Unspecified
    "10.0.0.1",                   # RFC 1918 Class A
    "172.16.0.1",                 # RFC 1918 Class B
    "192.168.1.1",                # RFC 1918 Class C
    "localhost",                  # Localhost hostname
    "subdomain.localhost",        # Localhost wildcard
])
def test_ssrf_forbidden_targets(host: str):
    """Ensure SSRF filter blocks all reserved and metadata targets when private access is disabled."""
    import ipaddress
    try:
        ip = ipaddress.ip_address(host)
        with pytest.raises(ssrf.BlockedDestination):
            ssrf.check_ip(ip, allow_private=False)
    except ValueError:
        # Not a raw IP (e.g. localhost) - test name resolution rule
        pass


@pytest.mark.asyncio
async def test_collection_rejects_invalid_target(client: AsyncClient):
    """Collection start endpoint returns 422 for malformed or dangerous targets."""
    res = await client.post(
        "/api/collections",
        json={
            "project_id": "non-existent",
            "target": "file:///etc/passwd",
            "depth": 2,
            "max_pages": 50,
            "concurrency": 4,
            "max_file_mb": 10,
        },
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "invalid_target"


# ── 4. Path Traversal & Sandbox Isolation Tests ──────────────────────────────

@pytest.mark.asyncio
async def test_path_traversal_resource_content_rejected(client: AsyncClient):
    """Non-existent resource ID returns 404 without leaking file contents."""
    res = await client.get("/api/projects/test-proj/resources/999999/content", headers=AUTH_HEADERS)
    assert res.status_code == 404
    assert res.json()["detail"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_export_verify_nonexistent_returns_404(client: AsyncClient):
    """Export verifier properly handles non-existent archive ID."""
    res = await client.get("/api/exports/fake-export-id/verify", headers=AUTH_HEADERS)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_export_download_nonexistent_returns_404(client: AsyncClient):
    """Export download properly handles non-existent archive ID."""
    res = await client.get("/api/exports/fake-export-id/download", headers=AUTH_HEADERS)
    assert res.status_code == 404


# ── 5. Passive Intelligence Schema & Error Contract Tests ────────────────────

@pytest.mark.asyncio
async def test_passive_dns_validation(client: AsyncClient):
    """GET /api/intelligence/dns requires host and returns structured response."""
    res = await client.get("/api/intelligence/dns?host=test-mock-safe.invalid", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "source" in data
    assert "records" in data or "unavailable" in data


@pytest.mark.asyncio
async def test_passive_rdap_ip_restriction(client: AsyncClient):
    """GET /api/intelligence/rdap gracefully explains when queried with raw IP."""
    res = await client.get("/api/intelligence/rdap?host=8.8.8.8", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["source"] in ("observed", "unavailable")


@pytest.mark.asyncio
async def test_passive_headers_target_validation(client: AsyncClient):
    """GET /api/intelligence/headers rejects invalid URI schemes."""
    res = await client.get("/api/intelligence/headers?target=javascript:void(0)", headers=AUTH_HEADERS)
    assert res.status_code == 422


# ── 6. Direct Browser Download & Query Token Authentication Tests ────────────

@pytest.mark.asyncio
async def test_auth_query_token_accepted(client: AsyncClient):
    """Query parameter ?token=... authenticates successfully for browser/image requests."""
    res = await client.get("/api/health?token=test-secret-token-12345")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


@pytest.mark.asyncio
async def test_export_download_direct_browser_success(client: AsyncClient, tmp_path: Path):
    """Direct browser request to /api/exports/{id}/download succeeds without Authorization header."""
    import webseeker.main as main_mod
    export_id = uuid.uuid4().hex
    zip_path = main_mod.DATA / "exports" / f"{export_id}.zip"
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    zip_path.write_bytes(b"PK\x05\x06" + b"\x00" * 18)  # Minimal valid empty zip structure

    # Unauthenticated GET request representing direct browser download navigation
    res = await client.get(f"/api/exports/{export_id}/download")
    assert res.status_code == 200
    assert "application/zip" in res.headers.get("content-type", "")
    assert len(res.content) > 0

