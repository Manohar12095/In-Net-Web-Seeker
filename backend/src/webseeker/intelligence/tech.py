"""Technology fingerprinting module.

Inspects HTTP response headers and body content against passive technology
signatures. Every finding includes explicit evidence, category, and confidence
level ('high', 'medium', 'low'). Never executes code or infers vulnerabilities.
"""
from __future__ import annotations
import re
from typing import Any
from ..ssrf import make_client

SIGNATURES = [
    # ─── CDNs & Edge ────────────────────────────────────────────────────────
    {"name": "Cloudflare", "cat": "CDN & Security", "header": "server", "pattern": r"cloudflare", "conf": "high"},
    {"name": "Cloudflare", "cat": "CDN & Security", "header": "cf-ray", "pattern": r".+", "conf": "high"},
    {"name": "Amazon CloudFront", "cat": "CDN", "header": "x-amz-cf-id", "pattern": r".+", "conf": "high"},
    {"name": "Amazon CloudFront", "cat": "CDN", "header": "via", "pattern": r"cloudfront", "conf": "high"},
    {"name": "Fastly", "cat": "CDN", "header": "x-fastly-request-id", "pattern": r".+", "conf": "high"},
    {"name": "Vercel", "cat": "PaaS / Hosting", "header": "x-vercel-id", "pattern": r".+", "conf": "high"},
    {"name": "Netlify", "cat": "PaaS / Hosting", "header": "server", "pattern": r"netlify", "conf": "high"},

    # ─── Web Servers ────────────────────────────────────────────────────────
    {"name": "Nginx", "cat": "Web Server", "header": "server", "pattern": r"nginx(?:/([\d.]+))?", "conf": "high"},
    {"name": "Apache", "cat": "Web Server", "header": "server", "pattern": r"apache(?:/([\d.]+))?", "conf": "high"},
    {"name": "Microsoft-IIS", "cat": "Web Server", "header": "server", "pattern": r"microsoft-iis(?:/([\d.]+))?", "conf": "high"},
    {"name": "Caddy", "cat": "Web Server", "header": "server", "pattern": r"caddy", "conf": "high"},
    {"name": "LiteSpeed", "cat": "Web Server", "header": "server", "pattern": r"litespeed", "conf": "high"},
    {"name": "OpenResty", "cat": "Web Server", "header": "server", "pattern": r"openresty", "conf": "high"},

    # ─── Frameworks & Runtimes ──────────────────────────────────────────────
    {"name": "Next.js", "cat": "Framework", "header": "x-powered-by", "pattern": r"next\.js", "conf": "high"},
    {"name": "Next.js", "cat": "Framework", "body": r"/_next/static/", "conf": "high"},
    {"name": "Nuxt.js", "cat": "Framework", "body": r"/_nuxt/", "conf": "high"},
    {"name": "Express", "cat": "Backend Framework", "header": "x-powered-by", "pattern": r"express", "conf": "high"},
    {"name": "PHP", "cat": "Language", "header": "x-powered-by", "pattern": r"php(?:/([\d.]+))?", "conf": "high"},
    {"name": "ASP.NET", "cat": "Framework", "header": "x-powered-by", "pattern": r"asp\.net", "conf": "high"},
    {"name": "Django", "cat": "Backend Framework", "header": "set-cookie", "pattern": r"csrftoken=", "conf": "medium"},
    {"name": "Ruby on Rails", "cat": "Backend Framework", "header": "x-powered-by", "pattern": r"phusion_passenger", "conf": "medium"},
    {"name": "Laravel", "cat": "Backend Framework", "header": "set-cookie", "pattern": r"laravel_session=", "conf": "high"},

    # ─── CMS ────────────────────────────────────────────────────────────────
    {"name": "WordPress", "cat": "CMS", "body": r"/wp-content/|/wp-includes/", "conf": "high"},
    {"name": "WordPress", "cat": "CMS", "body": r'<meta name="generator" content="WordPress\s*([\d.]+)?', "conf": "high"},
    {"name": "Drupal", "cat": "CMS", "header": "x-generator", "pattern": r"drupal", "conf": "high"},
    {"name": "Drupal", "cat": "CMS", "body": r"Drupal\.settings", "conf": "high"},
    {"name": "Ghost", "cat": "CMS", "body": r'<meta name="generator" content="Ghost\s*([\d.]+)?', "conf": "high"},
    {"name": "Shopify", "cat": "E-Commerce", "body": r"cdn\.shopify\.com", "conf": "high"},
    {"name": "Webflow", "cat": "CMS / Builder", "body": r"assets\.website-files\.com|wf-page", "conf": "high"},

    # ─── Frontend UI & Libraries ───────────────────────────────────────────
    {"name": "React", "cat": "UI Library", "body": r"data-reactroot|react-dom|__REACT_DEVTOOLS_GLOBAL_HOOK__", "conf": "high"},
    {"name": "Vue.js", "cat": "UI Framework", "body": r"data-v-[a-f0-9]+|vue\.esm|__vue__", "conf": "high"},
    {"name": "Angular", "cat": "UI Framework", "body": r"ng-version=|ng-binding", "conf": "high"},
    {"name": "Svelte", "cat": "UI Framework", "body": r"svelte-[a-z0-9]+", "conf": "high"},
    {"name": "Tailwind CSS", "cat": "CSS Framework", "body": r"tailwind|\b(?:flex|grid|hidden|text-zinc-|bg-zinc-)\b", "conf": "medium"},
    {"name": "Bootstrap", "cat": "CSS Framework", "body": r"bootstrap(?:\.min)?\.(?:css|js)", "conf": "high"},
    {"name": "jQuery", "cat": "JavaScript Library", "body": r"jquery(?:-([\d.]+))?(?:\.min)?\.js", "conf": "high"},

    # ─── Analytics & Tag Management ─────────────────────────────────────────
    {"name": "Google Tag Manager", "cat": "Tag Manager", "body": r"googletagmanager\.com/gtm\.js", "conf": "high"},
    {"name": "Google Analytics", "cat": "Analytics", "body": r"google-analytics\.com/(?:ga|analytics)\.js|gtag\('config'", "conf": "high"},
    {"name": "Plausible Analytics", "cat": "Analytics", "body": r"plausible\.io/js/script\.js", "conf": "high"},
    {"name": "Cloudflare Insights", "cat": "Analytics", "body": r"static\.cloudflareinsights\.com", "conf": "high"},
    {"name": "Hotjar", "cat": "Analytics", "body": r"static\.hotjar\.com", "conf": "high"},
    {"name": "Segment", "cat": "Analytics", "body": r"cdn\.segment\.com/analytics\.js", "conf": "high"},
]


async def detect(target_url: str) -> dict[str, Any]:
    """Detect technologies passively from target homepage."""
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url

    client = make_client(timeout=10.0)
    try:
        resp = await client.get(target_url)
        body = resp.text[:2_000_000]  # Cap inspect to 2MB
        headers = {k.lower(): v for k, v in resp.headers.items()}
    except Exception as e:
        await client.aclose()
        return {
            "status": "unavailable",
            "reason": str(e),
            "target": target_url,
            "technologies": [],
            "source": "unavailable",
        }
    finally:
        await client.aclose()

    detected: dict[str, dict[str, Any]] = {}

    for sig in SIGNATURES:
        name = sig["name"]
        cat = sig["cat"]
        conf = sig["conf"]
        evidence = None
        version = None

        if "header" in sig:
            h_key = sig["header"].lower()
            val = headers.get(h_key, "")
            if val:
                m = re.search(sig["pattern"], val, re.I)
                if m:
                    evidence = f"Header {sig['header']}: {val}"
                    if m.groups() and m.group(1):
                        version = m.group(1)

        elif "body" in sig:
            m = re.search(sig["body"], body, re.I)
            if m:
                matched_snippet = body[max(0, m.start() - 20):min(len(body), m.end() + 20)].strip()
                evidence = f"DOM match: ...{matched_snippet}..."
                if m.groups() and m.group(1):
                    version = m.group(1)

        if evidence:
            if name not in detected or (conf == "high" and detected[name]["confidence"] != "high"):
                detected[name] = {
                    "name": name,
                    "category": cat,
                    "evidence": evidence,
                    "confidence": conf,
                    "version": version,
                }

    return {
        "status": "observed",
        "target": target_url,
        "count": len(detected),
        "technologies": sorted(detected.values(), key=lambda x: (x["category"], x["name"])),
        "source": "observed",
    }
