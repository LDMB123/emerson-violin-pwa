# Rust-First Transition Plan — iPad mini 6 (A15) · iPadOS 26.2 · Safari 26.2
Date: 2026-02-05  
Goal: Move “most of the app” into Rust/Wasm with minimal JS, optimized only for iPadOS Safari 26.2.

This plan assumes:
- Secure context (https/localhost) is guaranteed.
- No backward compatibility is required.
- No Background Sync / Periodic Background Sync is available in Safari (foreground-only sync/migration).

## SECTION 1 — Target Architecture (Recommended + Alternatives)

### Recommended (Primary)
**SQLite database file persisted in OPFS, owned by a Dedicated Worker.**
- Single structured-data truth: SQLite file `emerson.db` in OPFS.
- DB worker: `public/db-worker.js` owns SQLite + OPFS IO.
- Rust/Wasm owns business logic and storage semantics:
  - DB client: `rust/db_client.rs`
  - Schema: `rust/db_schema.rs`
  - Migration orchestration: `rust/db_migration.rs`
  - Storage facade + IDB fallback: `rust/storage.rs`
- Cache Storage only for:
  - boot shell and immutable assets
  - optional packs (example: PDF pack)
- Large binaries:
  - OPFS files
  - SQLite stores metadata + OPFS path/hashes
- IndexedDB:
  - allowed only as a **temporary migration source** and as **SW share-target staging**

Why this is best on iPadOS Safari 26.2:
- Dedicated worker keeps DB IO off the main thread.
- OPFS is the fastest reliable local IO primitive available.
- SQLite gives strong migrations + query power and predictable performance on A15.

**Status in this repo**: already largely implemented (worker + schema + migration gating + perf + storage pressure surfacing). Remaining work is mainly cutover/purge hardening, push backend integration, and long-session on-device validation.

### Alternative A (Fallback if OPFS SQLite is unstable on-device)
**SQLite over IndexedDB-backed VFS.**
- Pros: avoids OPFS/SyncAccessHandle edge cases.
- Cons: IDB latency and transaction overhead; less predictable under iPadOS pressure.
- Use only if OPFS SQLite shows correctness or stability problems during on-device tests.

### Alternative B (Fallback if SQL is truly not needed)
**Rust domain layer over IndexedDB (no SQLite).**
- Pros: fewer moving parts.
- Cons: weaker migrations/integrity, higher per-op overhead, and harder query optimization.

## SECTION 2 — Roadmap Phases (Actionable)

### Phase 0 — Baseline Instrumentation and Guardrails
**Scope**: make failures visible and measurable on-device.
- Tasks (code)
  - Perf observers + surfaced metrics: `rust/perf.rs`, `index.html`.
  - DB round-trip latency percentiles: `rust/db_client.rs`, `index.html`.
  - Storage estimate + persistence UX: `rust/pwa.rs`, `rust/platform.rs`, `index.html`.
  - QuotaExceeded surfacing: `rust/storage_pressure.rs`, `rust/storage.rs`, `public/db-worker.js`.
- Risks & mitigations
  - Risk: telemetry overhead.
  - Mitigation: keep sampling small, avoid per-frame observers.
- Success criteria (measurable)
  - On iPad mini 6: cold start metrics visible; DB p50/p95/p99 populated.
  - Quota-like errors show “storage pressure” UI.
- Rollback
  - Keep instrumentation behind simple feature flags if needed.
- Complexity: M

### Phase 1 — Service Worker Minimize-and-Protect
**Scope**: reliable offline boot without cache bloat.
- Tasks (code)
  - Boot cache vs optional packs: `public/sw.js`, `scripts/build/build-sw-assets.js`, `index.html`, `rust/pwa.rs`.
  - Network-only `/api/*` to avoid caching dynamic calls: `public/sw.js`.
  - Share-target staging limited to SW-only IDB: `public/sw.js`.
- Risks & mitigations
  - Risk: pack caching partial failures under SW termination.
  - Mitigation: best-effort caching with visible counts + user-triggered retries.
- Success criteria
  - Offline installed cold start succeeds after one online run.
  - PDF viewer works offline only after pack is cached (expected and visible).
- Rollback
  - Collapse packs back into boot cache (not recommended due to eviction).
- Complexity: M

### Phase 2 — SQLite OPFS Worker + Rust DB API (Single Interface)
**Scope**: one DB interface with strong schema/migrations.
- Tasks (code)
  - SQLite OPFS worker: `public/db-worker.js`.
  - Rust DB messaging contract: `rust/db_messages.rs`.
  - Schema + PRAGMA tuning: `rust/db_schema.rs`.
  - Worker lifecycle + init: `rust/db_worker.rs`.
- Risks & mitigations
  - Risk: OPFS behavior differences on-device.
  - Mitigation: run OPFS tests on iPad; keep IDB fallback until proven.
- Success criteria
  - DB init works reliably on-device and survives reloads.
  - Query/write latency meets budgets (see Section 7).
- Rollback
  - Fallback to Alternative A (SQLite-over-IDB VFS).
- Complexity: H

### Phase 3 — Foreground Migration: IDB v5 → SQLite (Resumable + Verified)
**Scope**: migrate without data loss and only cut over after verification.
- Tasks (code)
  - Migration state + audit log tables: `rust/db_schema.rs`.
  - Orchestrator + resume checkpoints: `rust/db_migration.rs`.
  - Verification: counts + checksums gating: `rust/storage.rs` and migration summary.
  - Migration report export: `rust/db_migration.rs`, `index.html`.
- Risks & mitigations
  - Risk: partial migrations under storage pressure or app reload.
  - Mitigation: resumable checkpoints, idempotent writes, log export.
- Success criteria
  - Migration completes on iPad with realistic data volume.
  - `checksums_ok` flips true and stays true across reloads.
- Rollback
  - Keep IDB as read-only fallback until at least one stable release.
- Complexity: H

### Phase 4 — Cutover + IDB Purge (One Truth)
**Scope**: once verified, SQLite becomes authoritative and IDB is removed except SW staging.
- Tasks (code)
  - Enforce “SQLite-only” on verified devices: centralize `should_use_sqlite()` and ensure all reads/writes go through SQLite.
  - Purge IDB stores after verification:
    - Keep only SW staging DB `emerson-share-inbox` (SW local).
    - Remove app IDB stores (`emerson-violin-db`) after successful cutover.
  - Add a visible “DB mode” indicator:
    - `SQLite (verified)` vs `IDB fallback (migration pending)`.
- Risks & mitigations
  - Risk: edge-case code path still writes IDB, reintroducing drift.
  - Mitigation: audit `rust/storage.rs` for any IDB write path not gated; add assertions in debug builds.
- Success criteria
  - After verification, IDB is no longer used for primary domains.
  - Share-target staging still works.
- Rollback
  - Keep a release that can read both stores until field confidence is high.
- Complexity: M

### Phase 5 — Push Reminders (Installed-Only, Foreground Scheduled)
**Scope**: make “Reminders” real without relying on Background Sync.
- Tasks (code)
  - Client wiring (installed-only, gesture-permission): `rust/reminders.rs`.
  - SW handlers: `public/sw.js` for `push` + `notificationclick`.
  - Badging (optional, feature-detected): `rust/platform.rs` + SW → window message.
- Backend contract (not in this repo)
  - `GET /api/push/public-key` returns a VAPID public key (string or `{ publicKey }`).
  - `POST /api/push/subscribe` stores subscription for `deviceId`.
  - `POST /api/push/schedule` stores schedule (`time`, `days`, `tzOffsetMinutes`, `enabled`).
- Risks & mitigations
  - Risk: iPadOS Safari push permission friction.
  - Mitigation: prompt only after user presses Enable; require install.
- Success criteria
  - On an installed web app: enable → permission → server schedule → push delivered.
- Rollback
  - Disable reminders UI if backend unavailable (feature flag).
- Complexity: M (client), H (backend)

### Phase 6 — Wasm Threads (Optional) + On-Device Stability Gates
**Scope**: use threads only when stable and measurable on A15.
- Tasks (code)
  - Threads build: `npm run build:threads` (`--features wasm-threads` + atomics flags).
  - Runtime gating already exists: `rust/lib.rs` checks `crossOriginIsolated` + `SharedArrayBuffer`.
  - Add a stress test path (recommended):
    - DB batch + OPFS IO under load.
    - Long session (30–60 min) on-device.
- Risks & mitigations
  - Risk: Safari instability with threads + memory growth.
  - Mitigation: keep a non-threads build as the primary; treat threads build as opt-in until proven.
- Success criteria
  - No crashes/hangs on iPad mini 6 in long-session test.
- Rollback
  - Ship only the non-threads build.
- Complexity: M

## SECTION 3 — Data Migration Strategy (Critical)

### Detect existing data layout versions
- Identify IDB database/version: `emerson-violin-db` v5 (`rust/storage.rs`).
- Persist migration state in SQLite:
  - `migration_state` + `migration_log` tables (`rust/db_schema.rs`).

### Resumable migration design (foreground-only)
- Migrate by store in small batches.
- After each batch:
  - update `migration_state.last_store / last_key / last_index`
  - append `migration_log` entries for notable events
- Never delete IDB data until verification passes.

### Verification plan
- Counts per domain: expected vs migrated.
- Checksums:
  - stable hashing over IDs + critical fields.
- Sampling:
  - spot-compare payload equality on a small percentage of rows.
- Persist a migration audit log export:
  - “what happened, where it stopped, why it failed”.

### Backups and recovery
- Provide export snapshot:
  - structured data: SQLite export (JSON/CSV) plus migration report
  - binaries: OPFS file listing plus optional ZIP for user transfer (size-gated)
- Provide import flow:
  - schema version check
  - merge vs replace policy (explicit UX)

## SECTION 4 — Rust/Wasm Boundary Design (Minimal JS)

### Stable Rust API surface (worker-facing)
- `db_init(schema_sql, migrations, schema_version)`
- `exec(sql, params)`
- `query(sql, params) -> rows`
- `batch(statements, transaction)`
- `migration_summary() -> { counts, errors, checksums_ok }`

### Minimize boundary crossings
- Prefer `DB_BATCH` for grouped writes (single postMessage).
- Prefer paged queries returning UI-ready shapes.

### Serialization choices
- UI payloads: JSON rows (simple, small).
- Large/binary payloads: OPFS files; Rust passes paths/hashes, not blob bytes.

### Worker messaging protocol
- Request envelope: `type`, `request_id`, payload.
- Response envelope: `type`, `request_id`, `ok`, timing, optional error fields.
- Backpressure:
  - keep a bounded in-flight queue in `rust/db_client.rs`.
- Timeouts/cancellation:
  - implement request timeout on the Rust side for UI responsiveness.

## SECTION 5 — Offline/PWA Strategy (Safari 26.2)

### SW caching strategy
- Boot cache only for offline boot essentials.
- Packs (PDF) cached explicitly via user action.
- `/api/*` never cached.

### Update UX and “safe reload”
- Do not reload into a new version while migration is mid-flight.
- Prefer: “finish migration → then apply update”.

### SW + DB handshake
- The app is the source of truth for “migration verified”.
- SW update apply is gated by `migration_allows_update()` in Rust.

## SECTION 6 — Exploit Safari 26.2 Features to Reduce JS

- Use `<dialog>` for modals and confirmations (already used).
- Prefer native input types (`time`, `number`) for controls.
- Use `PerformanceObserver` for LCP/Event Timing/Long Tasks (already wired).
- Consider Navigation API only if it reduces complexity vs hash routing (feature-detect).

## SECTION 7 — Performance Plan (A15 + iPad constraints)

### Budgets (targets)
- Installed offline cold start: < 1.5s to usable UI.
- LCP (offline): < 2.0s.
- DB request latency (UI → worker → UI):
  - p50 < 8ms
  - p95 < 25ms
  - p99 < 60ms
- Memory steady-state: keep comfortably below jetsam thresholds by:
  - avoiding large in-memory caches
  - streaming where possible

### Concrete optimizations
- SQLite:
  - keep indexes aligned with UI query patterns
  - use WAL + NORMAL sync (already set)
  - batch writes
- UI:
  - avoid main-thread OPFS work
  - incremental rendering for large lists
- Boundary:
  - reduce postMessage chatter; batch by intent

## SECTION 8 — Push + Badging + App-like UX (When Appropriate)

- Push reminders:
  - require install + explicit user gesture
  - schedule only while app is open (server call); do not rely on Background Sync
- SW push handler:
  - show notification
  - on click: focus/open app to `#core`
  - payload schema (JSON):
  ```json
  {
    "title": "Practice reminder",
    "body": "Time to practice.",
    "url": "./#core",
    "tag": "reminder",
    "badge": 3
  }
  ```
- Badging:
  - keep badge sources explicit (share inbox count, error queue count, optional push)
  - use feature detection (`setAppBadge` / `clearAppBadge`)

## SECTION 9 — Testing Strategy (Must Include On-Device)

### Rust unit tests
- Domain logic tests for migration hashing, schema versioning, and invariants.

### Integration tests
- Migration:
  - simulate IDB dataset and validate SQLite counts + checksums.

### E2E offline tests (Playwright, where possible)
- Install flow (where automation can reach it).
- Offline cold start after first-run caching.
- Update path with migration in progress (ensure apply update is blocked).

### On-device Safari checklist (Web Inspector)
- SW:
  - cache entries exist in boot cache
  - pack cache fill works and reports counts
  - `/api/*` not cached
- OPFS:
  - OPFS test passes (main thread + worker)
  - SQLite file persists across reloads
- DB:
  - DB latency p50/p95/p99 stable under load
  - migration can resume after force-close/reopen
- Storage pressure:
  - `estimate()` reflects growth
  - quota-like failures surface a user-visible warning
- Threads build (if used):
  - `crossOriginIsolated` true
  - long-session stability (30–60 min)
