"""DNS intelligence module — A, AAAA, CNAME, MX, NS, TXT, SOA, CAA.

All results are labelled observed/unavailable. No network calls are made to
any API that requires keys. Uses dnspython's async stub resolver.
"""
from __future__ import annotations
import asyncio
from datetime import datetime, timezone

import dns.asyncresolver
import dns.exception
import dns.rdatatype

# Record types to query per lookup
RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA"]


async def _query(resolver: dns.asyncresolver.Resolver, host: str, rtype: str) -> list[str]:
    try:
        ans = await resolver.resolve(host, rtype, raise_on_no_answer=False)
        return [r.to_text() for r in ans]
    except (dns.exception.DNSException, asyncio.TimeoutError):
        return []


async def lookup(host: str) -> dict:
    """Return a dict of {record_type: [strings]} for the given host."""
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 8

    tasks = {rt: asyncio.create_task(_query(resolver, host, rt)) for rt in RECORD_TYPES}
    results: dict[str, list[str]] = {}
    for rt, task in tasks.items():
        try:
            results[rt] = await task
        except Exception:
            results[rt] = []

    return {
        "host": host,
        "queried_at": datetime.now(timezone.utc).isoformat(),
        "source": "observed",
        "records": {rt: vals for rt, vals in results.items() if vals},
        "unavailable": [rt for rt, vals in results.items() if not vals],
    }
