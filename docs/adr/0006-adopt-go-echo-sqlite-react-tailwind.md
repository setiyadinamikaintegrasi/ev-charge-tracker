# ADR-0006: Adopt Go + Echo + SQLite + React + Tailwind for EV Charge Tracker

**Date:** 2026-08-08
**Status:** Accepted

## Context

EV Charge Tracker is a single-user MVP for tracking EV charging sessions. Requirements: fast input (<30s), mobile-responsive, zero-config database, runs on Mac Mini M4.

## Decision

- **Backend:** Go + Echo framework — fast, single binary, excellent for REST API.
- **Database:** SQLite (via modernc.org/sqlite — pure Go, no CGO) — zero-config, embedded.
- **Frontend:** React 19 + Vite + Tailwind CSS — mobile-responsive SPA.
- **API style:** REST JSON.

## Alternatives considered

- **Node.js + Express + SQLite** — more dependencies, slower startup.
- **Python + FastAPI + SQLite** — good DX but slower runtime, more setup.
- **PostgreSQL** — overkill for single-user MVP, requires external server.

## Consequences

- Single Go binary serves API + static frontend files.
- SQLite file stored in `data/` directory.
- No external database server needed.
- CGO_ENABLED=0 possible (pure Go SQLite driver).
