# PRODUCT.md

**Status:** Approved baseline.

## Product vision

Aplikasi pencatatan sesi charging mobil listrik (EV) yang membantu pemilik EV melacak biaya energi, pola pengisian, dan efisiensi biaya per kilometer.

## Business problem

Pemilik mobil listrik tidak punya cara terpusat untuk mencatat sesi charging. Data tersebar di struk SPKLU, aplikasi berbeda-beda (PLN, Tesla, BYD, dll), dan tidak ada cara untuk menghitung total biaya energi per bulan atau efisiensi Rp/km.

## Target users

- Pemilik mobil listrik pribadi yang rutin charging di SPKLU atau home charging.
- Driver fleet EV yang perlu melaporkan biaya operasional.

## Stakeholder groups

- User (pemilik EV): input data charging, lihat statistik.
- Developer (Pak Joko): maintenance, feature development.

## User needs

- "Saya bisa mencatat setiap sesi charging dengan cepat (lokasi, kWh, biaya, waktu)."
- "Saya bisa melihat total biaya energi per bulan/tahun."
- "Saya bisa melihat efisiensi: Rp per kWh dan Rp per km."
- "Saya bisa melihat riwayat charging dan pola pengisian saya."

## Primary journeys

1. **Catat charging** — buka app → input lokasi, kWh, biaya, odometer → simpan.
2. **Lihat statistik** — dashboard → total biaya bulan ini, rata-rata Rp/kWh, grafik tren.
3. **Riwayat** — list semua sesi charging dengan filter bulan/lokasi.

## Business value

- Visibilitas biaya energi EV yang sebenarnya.
- Data untuk decision making: home charging vs SPKLU.
- Riwayat untuk laporan fleet/operasional.

## Product principles

- Simpel dan cepat — input charging < 30 detik.
- Mobile-first — dipakai saat di SPKLU.
- Data lokal — tidak butuh cloud untuk fungsi dasar.

## Success metrics

- Input sesi charging < 30 detik.
- Dashboard load < 1 detik.
- Zero data loss.

## Scope

- CRUD sesi charging (lokasi, tanggal, kWh, biaya, odometer).
- Dashboard statistik (total, rata-rata, tren).
- Filter riwayat per bulan/lokasi.
- Export data (CSV).

## Out of scope

- Integrasi API provider charging (PLN, Tesla, dll).
- Multi-user/auth (single user untuk MVP).
- Real-time monitoring charging.
- Notifikasi.

## Assumptions

- Single user, no auth needed for MVP.
- Mata uang: IDR (Rupiah).
- Satuan: kWh untuk energi, km untuk jarak.

## Constraints

- Mobile-responsive wajib.
- Berjalan di Mac Mini M4 (development).
- SQLite untuk kesederhanaan (no external DB server).
