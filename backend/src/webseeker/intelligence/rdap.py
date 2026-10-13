"""RDAP intelligence module — registration data via public RDAP bootstrap.

Uses the IANA RDAP bootstrap (https://data.iana.org/rdap/dns.json) to find
the right RDAP server for a TLD, then queries it via the SSRF-guarded client.
Results are labelled observed/unavailable. No API keys required.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any

from ..ssrf import make_client, BlockedDestination


# Bootstrap URL for RDAP server discovery
IANA_BOOTSTRAP = "https://data.iana.org/rdap/dns.json"
_bootstrap_cache: dict | None = None


async def _get_bootstrap() -> dict:
    global _bootstrap_cache
    if _bootstrap_cache:
        return _bootstrap_cache
    async with make_client(timeout=10) as client:
        r = await client.get(IANA_BOOTSTRAP, follow_redirects=True)
        _bootstrap_cache = r.json()
    return _bootstrap_cache


def _find_rdap_server(tld: str, bootstrap: dict) -> str | None:
    """Find the RDAP server URL for a given TLD from the IANA bootstrap."""
    for entry in bootstrap.get("services", []):
        tlds, urls = entry[0], entry[1]
        if tld.lower() in [t.lower() for t in tlds]:
            return urls[0].rstrip("/")
    return None


def _extract_entity(entity: dict) -> dict:
    """Extract clean contact info from an RDAP entity."""
    roles = entity.get("roles", [])
    vcard = entity.get("vcardArray", [None, []])[1]
    name = next((v[3] for v in vcard if v[0] == "fn"), None)
    email = next((v[3] for v in vcard if v[0] == "email"), None)
    org = next((v[3] for v in vcard if v[0] == "org"), None)
    return {k: v for k, v in {"roles": roles, "name": name, "email": email, "org": org}.items() if v}


async def lookup(host: str) -> dict:
    """Return registration/RDAP data for a domain. Always returns a dict with source label."""
    base = {
        "host": host,
        "queried_at": datetime.now(timezone.utc).isoformat(),
        "source": "observed",
    }

    # Extract TLD
    parts = host.rstrip(".").split(".")
    if len(parts) < 2:
        return {**base, "source": "unavailable", "error": "Not a domain"}

    tld = parts[-1]

    try:
        bootstrap = await _get_bootstrap()
    except Exception as e:
        return {**base, "source": "unavailable", "error": f"Bootstrap fetch failed: {e}"}

    rdap_base = _find_rdap_server(tld, bootstrap)
    if not rdap_base:
        return {**base, "source": "unavailable", "error": f"No RDAP server for .{tld}"}

    url = f"{rdap_base}/domain/{host}"
    try:
        async with make_client(timeout=15) as client:
            r = await client.get(url, follow_redirects=True)
            if r.status_code != 200:
                return {**base, "source": "unavailable", "error": f"RDAP HTTP {r.status_code}"}
            data: dict[str, Any] = r.json()
    except BlockedDestination as e:
        return {**base, "source": "unavailable", "error": f"SSRF blocked: {e}"}
    except Exception as e:
        return {**base, "source": "unavailable", "error": str(e)}

    # Parse response
    events = {ev["eventAction"]: ev["eventDate"] for ev in data.get("events", [])}
    entities = [_extract_entity(e) for e in data.get("entities", [])]
    nameservers = [ns.get("ldhName", "") for ns in data.get("nameservers", [])]
    status = data.get("status", [])

    return {
        **base,
        "handle": data.get("handle"),
        "status": status,
        "registered": events.get("registration"),
        "last_changed": events.get("last changed"),
        "expiry": events.get("expiration"),
        "nameservers": nameservers,
        "entities": entities,
        "rdap_url": url,
    }
