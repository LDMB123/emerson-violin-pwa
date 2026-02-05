# Rust-First Transition Plan — iPad mini 6 (A15) • iPadOS 26.2 • Safari 26.2
Date: 2026-02-05
Goal: Move most logic + data layer into Rust/Wasm with minimal JS, optimize only for iPadOS Safari 26.2.

## SECTION 1 — Target Architecture (Recommended + Alternatives)

### Recommended (Primary)
**SQLite file in OPFS, accessed via SyncAccessHandle inside a Dedicated Worker.**
- **Single source of truth**: SQLite database stored in OPFS.
- **DB worker**: Dedicated Worker owns DB file and IO using `createSyncAccessHandle()`.
- **Rust-first**: Rust/Wasm contains data layer + business logic. JS is a thin wrapper to:
  - create worker
  - open OPFS SyncAccessHandle
  - pass handle into Wasm via `wasm-bindgen`
- **Cache Storage**: only app shell + immutable assets required for offline boot.
- **Large binaries**: OPFS files; SQLite stores metadata + hashes + paths.
- **IndexedDB**: removed as primary store; only retained temporarily for migration.

Why this is best for iPadOS 26.2:
- OPFS + SyncAccessHandle in a worker gives **predictable latency** and reduces main-thread pressure.
- SQLite provides **consistent queries**, **schema migrations**, and strong integrity checks.
- A15 is strong enough for local SQL queries; moving IDB ops off the main thread reduces UI jank.

### Alternative A (If OPFS SyncAccessHandle is unstable)
**SQLite over IndexedDB-backed VFS** (e.g., wa-sqlite idb VFS).
- Pros: No SyncAccessHandle requirement.
- Cons: IDB latency and transaction overhead; less predictable on iPadOS.
- Still a single SQLite interface, but performance and IO stability are inferior.

### Alternative B (If SQL is not needed)
**Rust domain layer over IndexedDB (no SQLite).**
- Pros: Minimal new dependencies, less migration work.
- Cons: IDB performance, schema complexity, and consistency constraints remain.
- Harder to add robust migrations, query optimizations, and integrity checks.

**Recommendation remains OPFS SQLite**; alternatives are fallback-only.

---

## SECTION 2 — Roadmap Phases

### Phase 0 — Baseline + Feature Validation
**Scope**: Measurements + Safari capability validation.
- Tasks:
  - Add runtime performance telemetry (LCP, Event Timing, Long Tasks) using `PerformanceObserver` in Rust (via `web-sys`).
  - Add storage pressure checks: `storage.estimate()`, `storage.persisted()`.
  - Implement a small on-device OPFS test harness (write/read/rename/delete) with results logged to UI.
  - Verify `createSyncAccessHandle()` on iPad mini 6.
- Risks & Mitigations:
  - Risk: Telemetry overhead → keep sampling low and minimal.
  - Risk: OPFS differences on device → on-device test harness.
- Success criteria:
  - Baseline metrics captured on device (cold start, LCP, DB ops).
  - OPFS capability confirmed and measured.
- Rollback:
  - Feature flags for telemetry + OPFS harness.
- Complexity: **M**

### Phase 1 — DB Worker Scaffold (No Migration Yet)
**Scope**: Introduce dedicated DB worker and SQLite engine without user data.
- Tasks:
  - Add `public/db-worker.js` (minimal) to:
    - open OPFS root
    - create SyncAccessHandle
    - load Wasm + initialize DB
  - Add Rust module `rust/db_worker.rs` for DB entry points.
  - Choose SQLite implementation strategy:
    - Rust-compiled SQLite + custom VFS that calls JS SyncAccessHandle functions, OR
    - wasm sqlite distribution embedded and accessed via Rust FFI.
  - Implement DB file creation and a simple schema table (`schema_version`).
- Risks & Mitigations:
  - Risk: OPFS handle not transferable → create handle inside worker.
  - Risk: wasm + SyncAccessHandle integration complexity → spike + fallback to Alternative A.
- Success criteria:
  - SQLite DB file created in OPFS.
  - Simple read/write query works in worker.
- Rollback:
  - Disable DB worker feature flag.
- Complexity: **H**

### Phase 2 — Rust Data Layer API + Schema
**Scope**: Rust-first DB API with SQLite schema.
- Tasks:
  - Define schema covering all IDB stores (sessions, recordings, mlTraces, etc.).
  - Implement Rust API surface (see Section 4).
  - Add batched operations and pagination.
  - Implement OPFS binary storage for recordings + models with hashes in SQLite.
- Risks & Mitigations:
  - Risk: Schema mismatch with current IDB data → detailed mapping + migration staging.
  - Risk: Performance regressions → add query benchmarks in worker.
- Success criteria:
  - DB API supports read/write for all entities.
  - Latency target for queries met (see Section 7).
- Rollback:
  - Keep reads from IDB until migration complete.
- Complexity: **H**

### Phase 3 — Migration Pipeline (Foreground, Resumable)
**Scope**: Move data from IDB → SQLite.
- Tasks:
  - Add migration orchestrator in worker: detect IDB version and migrate in chunks.
  - Build migration audit log table (timestamp, counts, errors, last key).
  - Provide user backup export (JSON/CSV + binary file list).
- Risks & Mitigations:
  - Risk: Partial migration → resumable checkpoints + audit log.
  - Risk: UI blocking → migrate in small batches with yielding.
- Success criteria:
  - Migration completes on device under storage pressure.
  - Audit log validates counts and checksums.
- Rollback:
  - Keep IDB untouched until verification is complete.
- Complexity: **H**

### Phase 4 — Cutover + Cleanup
**Scope**: Switch read/write to SQLite and remove IDB usage.
- Tasks:
  - Update app to use DB worker API for all reads/writes.
  - Remove IDB schema in SW and Rust.
  - Update SW cache update handshake to be aware of DB schema version.
- Risks & Mitigations:
  - Risk: Incomplete migration on device → fallback to IDB read-only mode.
- Success criteria:
  - All data operations use SQLite.
  - IDB no longer used in runtime.
- Rollback:
  - Keep a versioned build that can read IDB in case of field failures.
- Complexity: **M**

---

## SECTION 3 — Data Migration Strategy (Critical)

### Detect existing data layout versions
- Read IDB `emerson-violin-db` version and store list.
- Store migration state in SQLite table `migration_state`:
  - `id`, `source_version`, `started_at`, `last_key`, `counts`, `errors`, `completed_at`.

### Resumable migration
- Perform migration in **foreground** only (no background sync).
- Batch size tuned for A15 (e.g., 200–500 records per batch).
- After each batch:
  - Update `migration_state`.
  - Yield to UI.

### Verification plan
- **Checksums**: For each table, store a rolling hash of IDs and sizes.
- **Invariants**:
  - No duplicate IDs.
  - Recordings with `opfs_path` must exist in OPFS.
- **Sampling**: Validate 1–5% of rows with full field comparison.
- **Migration audit log**: Persisted in SQLite for support visibility.

### Backups
- Provide user export:
  - Metadata: JSON/CSV from SQLite.
  - Binary: OPFS file list + optional ZIP (if feasible).
- Provide import flow:
  - Validate schema version.
  - Merge or replace logic with clear UX.

---

## SECTION 4 — Rust/Wasm Boundary Design (Minimal JS)

### Rust API surface (stable)
- `db_init()`
- `db_open()`
- `db_migrate()`
- `apply_batch(ops)`
- `query_page(query, page, size)`
- `search(query, limit)`
- `export_snapshot()`
- `import_snapshot(data)`
- `sync_outbox()`

### Minimize boundary crossings
- Batch writes and reads.
- Return UI-ready objects where feasible.
- Avoid per-row calls.

### Serialization strategy
- Small payloads: JSON (simple and readable).
- Larger payloads: binary `postcard`/`bincode` via `Uint8Array` for speed + size.

### Worker messaging protocol
- Envelope:
  - `id`, `op`, `payload`, `timeout_ms`
- Response:
  - `id`, `ok`, `result` or `error`
- Backpressure:
  - Queue length limit
  - Reject when full
- Cancellation:
  - `abort` message by `id`

### Wasm threads (if used)
- **Headers required**: COOP/COEP already configured in `public/_headers` and `Trunk.toml`.
- **Build flags**: `-C target-feature=+atomics,+bulk-memory,+mutable-globals` and `--features wasm-threads`.
- **Memory model**:
  - Prefer fixed memory with threads for stability.
  - If growable memory is needed, add a fallback single-threaded build.
- **On-device stability tests**:
  - Stress test with max parallel queries + OPFS IO.
  - Long session test (30+ minutes) to detect thread crashes.

---

## SECTION 5 — Offline/PWA Strategy (Safari 26.2)

### SW caching strategy
- Use **cache-first** for app shell + immutable assets only.
- Move large optional assets to on-demand fetch (not precached).
- Version caches by build hash and keep only the latest + one fallback.

### Update UX
- Keep current banner flow (`Update ready`).
- Add DB version check before applying update.
- If DB migration pending, block reload and show a “Finish migration” prompt.

### SW + DB handshake
- App writes `db_schema_version` to localStorage/SQLite.
- SW includes `app_schema_version` in cache metadata.
- If mismatch: prevent update until migration completes.

---

## SECTION 6 — Safari 26.2 Features to Reduce JS

### Declarative HTML/CSS replacements
- Continue use of `<dialog>` and `:target` routing.
- Replace JS-driven toggles with native `<details>` + CSS where possible.
- Use native form validation instead of JS (when appropriate).

### Navigation API
- If supported in Safari 26.2, move hash routing to Navigation API for clearer state transitions.
- Add feature detection; fallback to current hash routing if unavailable.

### Performance APIs
- Implement `PerformanceObserver` for:
  - LCP
  - Event Timing (input delay)
  - Long tasks
- Expose metrics in a debug panel for on-device testing.

---

## SECTION 7 — Performance Plan (A15 + iPad constraints)

### Budgets (targets)
- Cold start (installed, offline): **< 1.5s** to first interactive UI.
- LCP: **< 2.0s** (offline), **< 2.5s** (online).
- DB query latency (UI → worker → UI): p50 **< 8ms**, p95 **< 25ms**, p99 **< 60ms**.
- Batch write throughput: **> 2,000 ops/sec** in worker.
- Memory: steady-state **< 300MB** (avoid jetsam).

### Optimizations
- Batch reads/writes and avoid per-item IDB calls.
- Use prepared statements and indexes in SQLite.
- Virtualize large lists to reduce DOM cost.
- Avoid main-thread OPFS operations.
- Minimize JS/Wasm crossings.

---

## SECTION 8 — Push + Badging + App-like UX

- Request push permission only after explicit user gesture.
- Minimal push payloads; use push to **prompt opening the app** (not background sync).
- Maintain badge counts in Rust with a single source of truth.

---

## SECTION 9 — Testing Strategy (Includes On-Device)

### Rust tests
- Unit tests for domain logic.
- Integration tests for DB schema + migrations.

### E2E (offline)
- Install flow + offline cold start.
- Update + migration path (offline → online).
- OPFS file persistence across reloads.

### On-device Safari testing checklist
- OPFS SyncAccessHandle read/write under load.
- DB worker stability during long sessions.
- Cache eviction simulation (fill storage + confirm behavior).
- Push permission, push delivery, badge updates.

