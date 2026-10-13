import pytest
from webseeker.intelligence import dns as dns_intel
from webseeker.intelligence import rdap as rdap_intel
from webseeker.intelligence import headers as headers_intel
from webseeker.intelligence import tls as tls_intel
from webseeker.intelligence import tech as tech_intel


@pytest.mark.asyncio
async def test_dns_lookup_invalid_or_unavailable():
    # Looking up a domain that does not resolve should return structured unavailable records
    res = await dns_intel.lookup("non-existent-subdomain-123456789.invalid")
    assert res["source"] == "observed"
    assert "A" in res["unavailable"]
    assert "MX" in res["unavailable"]


@pytest.mark.asyncio
async def test_rdap_lookup_structure():
    res = await rdap_intel.lookup("invalid-domain-xyz123.unknown-tld-999")
    assert res["source"] in ("observed", "unavailable")


@pytest.mark.asyncio
async def test_headers_audit_unreachable():
    res = await headers_intel.audit("https://127.0.0.1:54321")
    assert res["source"] == "unavailable"
    assert "reason" in res


@pytest.mark.asyncio
async def test_tls_inspect_unreachable():
    res = await tls_intel.inspect("127.0.0.1", port=54321)
    assert res["status"] == "unavailable"
    assert "reason" in res


@pytest.mark.asyncio
async def test_tech_detect_unreachable():
    res = await tech_intel.detect("https://127.0.0.1:54321")
    assert res["status"] == "unavailable"
