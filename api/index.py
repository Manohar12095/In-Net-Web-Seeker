"""
api/index.py – Vercel Serverless Function entry point.

Vercel treats every *.py inside /api as a serverless function.
The rewrite rule in vercel.json sends all /api/* traffic here.
We simply re-export the existing FastAPI app from the backend package.
"""

import sys, os
from pathlib import Path

# ── Make the backend package importable ─────────────────────────────────────
# Project layout on Vercel:
#   /var/task/                ← repo root (cwd)
#   /var/task/backend/src/    ← Python package root
ROOT = Path(__file__).resolve().parent.parent          # repo root
BACKEND_SRC = ROOT / "backend" / "src"

if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

# ── Pull in the real FastAPI app ─────────────────────────────────────────────
from webseeker.main import app   # noqa: E402  (import after sys.path fix)

# Vercel's Python runtime looks for a top-level variable named `app`
# that is a valid ASGI/WSGI callable. FastAPI satisfies both.
__all__ = ["app"]
