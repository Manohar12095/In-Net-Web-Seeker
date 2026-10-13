Visit At : https://in-net-web-seeker.vercel.app

# In Net Web Seeker

**Collect. Analyze. Explore.**

*Powered by IN NET Creations · Created by S. Manohar*

[![Version](https://img.shields.io/badge/version-0.1.0-2DD4BF.svg)](https://github.com/)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-zinc.svg)](LICENSE)
[![Engine](https://img.shields.io/badge/engine-FastAPI%20%7C%20Python%203.12%2B-blue.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%7C%20Vite%20%7C%20Tailwind%20v4-teal.svg)](https://react.dev/)

A modern desktop platform for website intelligence, public asset collection, infrastructure analysis, and offline investigation. Built for security analysts, OSINT researchers, and web engineers.

> **Authorized Use Only:** Only collect and analyze websites, servers, and digital systems you own or have explicit written permission to test. In Net Web Seeker strictly performs read-only GET requests with zero exploitation.

---

## 🚀 Quick Start (One-Click)

On Windows, double-click **`run.bat`** in the project root:

```bat
run.bat
```

This single command:
1. Verifies your Node.js and Python (`uv`) environment.
2. Boots the Python FastAPI intelligence engine on `127.0.0.1:8765`.
3. Launches the Vite React frontend on `http://localhost:1420`.
4. Automatically opens `http://localhost:1420` in your default browser.

---

## 🛠️ Manual Execution

If you prefer running via terminal:

```bash
# 1. Install frontend dependencies
npm install

# 2. Run both the engine and UI concurrently
npm run dev:all
```

Or run the components independently:

```bash
# Terminal 1: Python Engine (FastAPI)
npm run engine
# or: cd backend && uv run python -m webseeker --dev --allow-private --port 8765 --data-dir ../.dev-data

# Terminal 2: Vite React UI
npm run dev
```

---

## 🌟 Key Features

- **Real-Time Target Validation (`/api/targets/validate`):**
  Zero-network parsing for domains, URLs, IPv4, and IPv6 with live status feedback, port checks, and automatic pipeline module arming.
- **SSRF-Guarded HTTP Client:**
  Outbound requests resolve DNS and strictly validate IPs against loopback, link-local, RFC 1918, and cloud metadata ranges (with DNS rebinding defense).
- **Perpetual SVG Wave Atmosphere:**
  Cockpit-dense UI featuring an animated SVG wave background adhering to high-end design taste and `prefers-reduced-motion` safety.
- **One-Time Authorized Use Policy Dialog:**
  Enforces legal confirmation before the first collection run, persisted to storage.
- **Content-Addressed Asset Storage:**
  Downloads are streamed directly to disk, hashed with SHA-256 on the fly, deduplicated, and size-capped to prevent decompression bombs.
- **Cryptographic ZIP Export:**
  Export entire project investigations into self-verifying standalone ZIP archives with a complete SHA-256 hash manifest.
- **100% Offline Capability:**
  Bundles local fonts (*Space Grotesk*, *IBM Plex Sans*, *JetBrains Mono*) and operates fully offline without external CDN dependencies.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   IN NET WEB SEEKER                      │
│                                                          │
│   Frontend (React 19 + TypeScript + Vite + Tailwind v4)   │
│   • AppShell & Cockpit Header                            │
│   • Animated WaveBackground                              │
│   • Live TargetInput & Validation Trays                  │
│   • Recent Projects Tray                                 │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP (Bearer Token Secured)
                           │ SSE Stream for Live Events
┌──────────────────────────▼───────────────────────────────┐
│              Python 3.12+ FastAPI Engine                 │
│   • target_parser.py  (DNS/IP validation)                │
│   • ssrf.py           (SSRF guard & DNS rebinding)       │
│   • downloader.py     (Atomic SHA-256 streams)           │
│   • crawler.py        (Breadth-first scoped crawl)       │
│   • db.py             (SQLite persistence)               │
│   • exporter.py       (Content-addressed ZIP bundles)    │
└──────────────────────────┬───────────────────────────────┘
                           │
                 SQLite Metadata & Filesystem
```

---

## 📁 Project Structure

```
IN Net Web Seeker/
├── run.bat                          # One-click Windows startup launcher
├── README.md                        # Project documentation & user guide
├── package.json                     # Frontend dependencies & npm scripts
├── vite.config.ts                   # Vite & Vitest configuration
├── tsconfig.json                    # TypeScript compiler configuration
├── docs/
│   ├── MASTER_PROMPT.md             # Complete 8-phase blueprint & specifications
│   └── PROGRESS.md                  # Phase tracking & handoff status log
├── src/
│   ├── index.css                    # Design system tokens & animations
│   ├── App.tsx                      # Root workspace routing
│   ├── main.tsx                     # React root mount
│   ├── components/
│   │   └── AppShell.tsx             # Cockpit layout & live engine telemetry
│   ├── features/home/
│   │   ├── HomePage.tsx             # Main hero landing page
│   │   ├── WaveBackground.tsx       # Animated wave background
│   │   ├── TargetInput.tsx          # Real-time target validator
│   │   ├── RecentProjects.tsx       # Saved SQLite project chips
│   │   ├── FeatureCards.tsx         # Capabilities highlight grid
│   │   ├── AuthorizedUseDialog.tsx  # One-time consent modal
│   │   ├── NewCollectionDialog.tsx  # New collection configuration modal
│   │   └── useTargetValidation.ts   # Debounced API validation hook
│   └── lib/
│       └── api.ts                   # Universal API client & SSE consumer
├── backend/
│   ├── pyproject.toml               # Python package configuration (uv)
│   ├── src/webseeker/
│   │   ├── __main__.py              # CLI entry point
│   │   ├── main.py                  # FastAPI server routes
│   │   ├── target_parser.py         # URL/domain/IP parser
│   │   ├── ssrf.py                  # Guarded HTTP transport
│   │   ├── downloader.py            # Stream-to-disk downloader
│   │   ├── crawler.py               # Async web crawler
│   │   ├── db.py                    # SQLite database models
│   │   └── exporter.py              # ZIP archive generator
│   └── tests/
│       └── test_core.py             # 16 automated backend test cases
├── fixtures/
│   └── server.py                    # Local test web server
└── src-tauri/
    ├── Cargo.toml                   # Tauri shell configuration
    └── src/lib.rs                   # Native shell & sidecar supervisor
```

---

## 🧪 Verification & Testing

Run all automated test suites across frontend and backend:

```powershell
# Run backend pytest suite (16 tests)
cd backend
uv run pytest tests/test_core.py -q

# Run frontend Vitest suite
cd ..
npx vitest run

# Run production build validation
npm run build
```

---

## 🛡️ Trust Rules & Policy

1. **Facts Are Sourced:** Facts are explicitly labeled **observed**, **inferred**, **potential risk**, or **unavailable**. Missing data is never fabricated.
2. **GET Only:** No state-changing POST requests, no form submission fuzzing, no credential bruteforcing.
3. **No Bypass:** No CAPTCHA defeating, paywall evasion, or authenticated session hijacking.
4. **Sandboxed Untrusted Content:** Scraped HTML, SVG, and scripts are never executed unsafely in user contexts.

---

## 📄 License & Attribution

- **Brand:** In Net Web Seeker
- **Powered by:** IN NET Creations
- **Created by:** S. Manohar
- **Status:** All rights reserved. Refer to `LICENSE` for terms.
