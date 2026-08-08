# DESIGN.md

**Status:** Approved baseline.

## Problem statement

Pemilik EV butuh cara sederhana mencatat sesi charging dan melihat statistik biaya energi tanpa cloud dependency atau multi-provider integration.

## Business objectives

- Catat sesi charging dalam < 30 detik.
- Tampilkan statistik biaya energi yang actionable.
- Jalan di mobile browser, data tersimpan lokal.

## Scope

- Backend: REST API (CRUD charge sessions + stats).
- Frontend: SPA mobile-responsive.
- Database: SQLite (embedded, zero-config).

## Out of scope

- Auth/multi-user, integrasi provider API, real-time monitoring, notifikasi.

## Data model

### charge_sessions

| Field | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, autoincrement |
| date | TEXT | ISO 8601 date, NOT NULL |
| location | TEXT | NOT NULL (nama SPKLU/lokasi) |
| energy_kwh | REAL | NOT NULL, > 0 |
| cost_idr | INTEGER | NOT NULL, >= 0 |
| odometer_km | INTEGER | nullable (untuk hitung Rp/km) |
| notes | TEXT | nullable |
| created_at | TEXT | default CURRENT_TIMESTAMP |
| updated_at | TEXT | default CURRENT_TIMESTAMP |

### API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/sessions` | List sessions (filter: month, year, location) |
| GET | `/api/sessions/:id` | Get single session |
| POST | `/api/sessions` | Create session |
| PUT | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/stats` | Statistics (total cost, total kWh, avg Rp/kWh, count) |
| GET | `/api/stats/monthly` | Monthly breakdown |
| GET | `/api/export.csv` | Export all sessions as CSV |

## Acceptance criteria

1. **Create session** — POST `/api/sessions` dengan date, location, energy_kwh, cost_idr → 201 dengan session object.
2. **List sessions** — GET `/api/sessions` → 200 array, sorted by date DESC.
3. **Filter sessions** — `?month=8&year=2026` → hanya session di bulan tersebut.
4. **Update session** — PUT dengan partial fields → 200 updated object.
5. **Delete session** — DELETE → 204.
6. **Stats** — GET `/api/stats` → total_cost, total_kwh, avg_cost_per_kwh, session_count.
7. **Monthly stats** — GET `/api/stats/monthly` → array per bulan {year, month, total_cost, total_kwh, count}.
8. **CSV export** — GET `/api/export.csv` → text/csv, headers: date,location,energy_kwh,cost_idr,odometer_km,notes.
9. **Validation** — energy_kwh > 0, cost_idr >= 0, date valid ISO 8601.
10. **Mobile UI** — form input < 30 detik, dashboard responsive, tabel scroll horizontal.

## Technology stack

Go (Echo) + SQLite + React (Vite) + Tailwind CSS. See ADR-0006.

## Personas

- **Pak Joko** — pemilik EV, input charging dari HP, lihat statistik dari browser.

## Risks

- SQLite concurrency terbatas (cukup untuk single-user MVP).
- No auth — jangan deploy ke public internet tanpa tambahan auth layer.
