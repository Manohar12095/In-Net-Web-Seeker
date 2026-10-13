"""Security headers, cookies, and CORS audit module.

Performs a single guarded GET request via ssrf.make_client() to evaluate
security header posture, cookie security flags, and CORS exposure.
All output adheres to the trust model: strictly 'observed' or 'unavailable'.
"""
from __future__ import annotations
import httpx
from typing import Any
from ..ssrf import make_client

SECURITY_HEADER_SPECS = [
    {
        "name": "Strict-Transport-Security",
        "description": "Enforces secure HTTPS connections and prevents SSL-stripping.",
        "recommended": "max-age=31536000; includeSubDomains; preload",
        "weight": 25,
    },
    {
        "name": "Content-Security-Policy",
        "description": "Restricts resource origins to prevent Cross-Site Scripting (XSS).",
        "recommended": "default-src 'self'; script-src 'self' ...",
        "weight": 30,
    },
    {
        "name": "X-Frame-Options",
        "description": "Defends against clickjacking attacks by controlling iframe embedding.",
        "recommended": "DENY or SAMEORIGIN",
        "weight": 15,
    },
    {
        "name": "X-Content-Type-Options",
        "description": "Prevents MIME-sniffing away from the declared content-type.",
        "recommended": "nosniff",
        "weight": 10,
    },
    {
        "name": "Referrer-Policy",
        "description": "Controls how much referrer information is included with requests.",
        "recommended": "strict-origin-when-cross-origin",
        "weight": 10,
    },
    {
        "name": "Permissions-Policy",
        "description": "Governs browser features like camera, microphone, geolocation.",
        "recommended": "camera=(), microphone=(), geolocation=()",
        "weight": 10,
    },
]


async def audit(target_url: str) -> dict[str, Any]:
    """Audit HTTP security headers, cookies, and CORS configuration."""
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url

    client = make_client(timeout=10.0)
    try:
        resp = await client.get(target_url)
    except Exception as e:
        await client.aclose()
        return {
            "status": "unavailable",
            "reason": str(e),
            "target": target_url,
            "source": "unavailable",
        }
    finally:
        await client.aclose()

    headers = {k.lower(): v for k, v in resp.headers.items()}
    raw_headers = dict(resp.headers)

    # 1. Audit Security Headers
    findings = []
    earned_score = 0
    total_score = sum(h["weight"] for h in SECURITY_HEADER_SPECS)

    for spec in SECURITY_HEADER_SPECS:
        h_name = spec["name"]
        val = headers.get(h_name.lower())
        present = val is not None
        if present:
            earned_score += spec["weight"]
            findings.append({
                "header": h_name,
                "status": "pass",
                "value": val,
                "description": spec["description"],
                "recommendation": spec["recommended"],
                "weight": spec["weight"],
            })
        else:
            findings.append({
                "header": h_name,
                "status": "missing",
                "value": None,
                "description": spec["description"],
                "recommendation": spec["recommended"],
                "weight": spec["weight"],
            })

    # Calculate Grade
    ratio = earned_score / total_score if total_score else 0
    if ratio >= 0.95:
        grade = "A+"
    elif ratio >= 0.85:
        grade = "A"
    elif ratio >= 0.70:
        grade = "B"
    elif ratio >= 0.50:
        grade = "C"
    elif ratio >= 0.30:
        grade = "D"
    else:
        grade = "F"

    # 2. Audit Cookies
    cookies = []
    for c_header in resp.headers.get_list("set-cookie"):
        lower_c = c_header.lower()
        parts = [p.strip() for p in c_header.split(";")]
        name_val = parts[0] if parts else "cookie"
        name = name_val.split("=")[0] if "=" in name_val else name_val
        cookies.append({
            "name": name,
            "raw": c_header,
            "secure": "secure" in lower_c,
            "httponly": "httponly" in lower_c,
            "samesite": "strict" if "samesite=strict" in lower_c else ("lax" if "samesite=lax" in lower_c else ("none" if "samesite=none" in lower_c else "unspecified")),
        })

    # 3. Audit CORS
    cors = {
        "allow_origin": headers.get("access-control-allow-origin"),
        "allow_credentials": headers.get("access-control-allow-credentials"),
        "allow_methods": headers.get("access-control-allow-methods"),
        "allow_headers": headers.get("access-control-allow-headers"),
        "is_wildcard": headers.get("access-control-allow-origin") == "*",
    }

    # 4. Server & Powered-By disclosure
    disclosures = []
    if "server" in headers:
        disclosures.append({"header": "Server", "value": headers["server"]})
    if "x-powered-by" in headers:
        disclosures.append({"header": "X-Powered-By", "value": headers["x-powered-by"]})
    if "x-aspnet-version" in headers:
        disclosures.append({"header": "X-AspNet-Version", "value": headers["x-aspnet-version"]})

    return {
        "status": "observed",
        "target": target_url,
        "http_status": resp.status_code,
        "score": earned_score,
        "max_score": total_score,
        "grade": grade,
        "headers": findings,
        "raw_headers": raw_headers,
        "cookies": cookies,
        "cors": cors,
        "disclosures": disclosures,
        "source": "observed",
    }
