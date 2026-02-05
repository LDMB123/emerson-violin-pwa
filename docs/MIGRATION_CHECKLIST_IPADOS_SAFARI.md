# Migration Checklist — iPad mini 6 (A15) · iPadOS 26.2 · Safari 26.2
Date: 2026-02-05

This checklist is dependency-ordered. Treat each “Ship Stop” as a release gate.

## Phase 0 — Visibility First (Instrumentation + Guardrails)
- [x] Runtime perf telemetry wired (LCP/Event/Long Tasks): `rust/perf.rs`.
- [x] DB latency metrics surfaced (p50/p95/p99): `rust/db_client.rs`, `index.html`.
- [x] Storage usage + quota shown (`navigator.storage.estimate()`): `rust/pwa.rs`.
- [x] Storage persistence strategy:
- [x] `persisted()` surfaced: `rust/pwa.rs`.
- [x] `persist()` requested automatically: `rust/platform.rs`.
- [x] User-gesture persistence button: `index.html`, `rust/pwa.rs`.
- [x] OPFS on-device test harness (main thread + worker): `rust/opfs_test.rs`, `public/opfs-test-worker.js`.
- [x] QuotaExceeded surfacing (OPFS/IDB/SQLite worker): `rust/storage_pressure.rs`, `public/db-worker.js`.

**Ship Stop 0 — On-device diagnostics verified**
- Must-have instrumentation:
- Storage estimate + persisted state visible.
- OPFS tests pass.
- DB latency panel populated after normal use.
- Validation:
- Confirm on iPad mini 6 via Web Inspector (no crashes, metrics update).

## Phase 1 — DB Worker + Schema (SQLite in OPFS)
- [x] DB worker exists and uses OPFS SQLite: `public/db-worker.js`.
- [x] Schema + PRAGMA tuning defined in Rust: `rust/db_schema.rs`.
- [x] Rust DB client + request/response contract: `rust/db_messages.rs`, `rust/db_client.rs`.
- [x] DB init + migrations wired to UI controls: `rust/db_worker.rs`, `index.html`.

**Ship Stop 1 — DB worker stable**
- Must-have instrumentation:
- DB init status visible.
- DB latency percentiles stable during interactive use.
- Validation:
- Repeated reloads preserve `emerson.db` and schema version.

## Phase 2 — Foreground Migration (IDB v5 → SQLite), Resumable + Verified
- [x] Migration state table + log table: `rust/db_schema.rs`.
- [x] Foreground orchestrator with checkpoints: `rust/db_migration.rs`.
- [x] Verification gating before cutover: `rust/storage.rs` (`should_use_sqlite()`).
- [x] Migration report export: `index.html`, `rust/db_migration.rs`.

**Ship Stop 2 — Migration trial proven**
- Must-have instrumentation:
- Migration progress and error counts visible.
- “Checksums OK” is required before switching to SQLite-only reads.
- Validation:
- Force-close/reopen during migration resumes and completes.
- Counts and checksums match on-device.

## Phase 3 — Cutover: SQLite as the Only Structured-data Truth
- [ ] After verification, route all domain reads/writes to SQLite paths.
- [ ] Make IDB read-only fallback timeboxed to one release.
- [ ] Add a visible “DB mode” indicator:
- SQLite verified
- IDB fallback (migration pending)
- [ ] Purge app IDB database after verification (keep SW staging only).

**Ship Stop 3 — Full cutover**
- Must-have instrumentation:
- Storage pressure warnings still functional.
- Export/import works.
- Validation:
- Offline cold start works installed.
- No IDB reads/writes remain for primary domains.

## Phase 4 — SW Minimalism + Optional Packs
- [x] Boot cache vs optional PDF pack split: `public/sw.js`.
- [x] Pack caching UX + status: `index.html`, `rust/pwa.rs`.
- [x] `/api/*` is network-only in SW: `public/sw.js`.
- [x] SW IDB usage limited to share-target staging only: `public/sw.js`.

**Ship Stop 4 — Offline boot durability**
- Must-have instrumentation:
- Boot cache status visible.
- Pack status visible and accurate.
- Validation:
- Installed offline cold start works after one online boot.
- Pack caching survives reload; partial failures are visible.

## Phase 5 — Push Reminders (Installed-only)
- [x] Client wiring (permission + subscribe + schedule calls): `rust/reminders.rs`.
- [x] SW `push` and `notificationclick` handlers: `public/sw.js`.
- [ ] Backend contract implemented:
- `GET /api/push/public-key`
- `POST /api/push/subscribe`
- `POST /api/push/schedule`
- [ ] On-device push end-to-end validation (installed web app).

**Ship Stop 5 — Reminders real**
- Must-have instrumentation:
- Reminder status shows “enabled” vs “pending”.
- Validation:
- Enable reminders schedules successfully online.
- Push arrives and opens/focuses app when tapped.

## Phase 6 — Optional: Wasm Threads Build (Risk-managed)
- [x] Threads build exists: `npm run build:threads`.
- [x] Runtime gating on `crossOriginIsolated` + SAB: `rust/lib.rs`.
- [ ] Add on-device stress harness for threads build (recommended).
- [ ] Long-session stability run (30–60 minutes) on iPad mini 6.

**Ship Stop 6 — Threads allowed (only if stable)**
- Validation:
- No hangs/crashes; memory stable.
- Fallback:
- Continue shipping non-threads build as primary if any instability exists.

