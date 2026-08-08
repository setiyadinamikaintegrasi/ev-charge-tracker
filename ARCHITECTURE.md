# ARCHITECTURE.md

**Status:** Approved baseline — EV Charge Tracker.

## System boundaries

Single-user EV charging session tracker. Backend (Go + Echo) serves REST API and static frontend. SQLite database embedded in the binary process.

## Major components

- **Backend** (`src/backend/`) — Go + Echo REST API, SQLite database, serves static files.
- **Frontend** (`src/frontend/`) — React 19 SPA, Vite, Tailwind CSS v4.
- **Database** (`data/evcharge.db`) — SQLite embedded.

## C4 container view

```text
┌─────────────────────────────────┐
│         Mobile Browser          │
│   (React SPA — Tailwind CSS)    │
└──────────┬──────────────────────┘
           │ HTTP (REST JSON)
           ▼
┌─────────────────────────────────┐
│     Go Binary (port 8100)       │
│  ┌───────────┐ ┌─────────────┐  │
│  │ Echo API  │ │ Static File │  │
│  │ /api/*    │ │   Server    │  │
│  └─────┬─────┘ └─────────────┘  │
│        │                        │
│        ▼                        │
│  ┌───────────────────────────┐  │
│  │ SQLite (data/evcharge.db) │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Data flow

1. **Create session** — Browser → POST /api/sessions → Echo handler → SQLite INSERT → 201 JSON.
2. **Dashboard** — Browser → GET /api/stats + GET /api/stats/monthly → aggregate queries → JSON.
3. **History** — Browser → GET /api/sessions?month=X&year=Y → SQLite SELECT → JSON array.
4. **Export** — Browser → GET /api/export.csv → SQLite SELECT → CSV response.

## Security zones

- **Trusted:** localhost development environment.
- **Untrusted:** Public internet — DO NOT deploy without auth layer.
- **Data:** Local SQLite file, no PII beyond charging data.

## Deployment topology

Development: Vite dev server (:5174) proxies to Go backend (:8100).
Production: Single Go binary serves API + frontend dist on :8100.
