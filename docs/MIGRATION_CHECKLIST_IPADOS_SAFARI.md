# Migration Checklist — iPad mini 6 (A15) • iPadOS 26.2 • Safari 26.2
Date: 2026-02-05

## Phase 0 — Baseline & Instrumentation
- [ ] Add runtime perf telemetry (LCP, Event Timing, Long Tasks).
- [ ] Add storage pressure indicators (`storage.estimate()`, `persisted()` result).
- [ ] Add OPFS on-device test harness with visible results.
- [ ] Capture baseline metrics on iPad mini 6.

**Ship Stop 0 — Baseline Verified**
- Must-have instrumentation: LCP + Event Timing + storage usage + OPFS test.
- Validation: all metrics report correctly on device; no crashes.

## Phase 1 — DB Worker Scaffold
- [ ] Create minimal DB worker (JS wrapper + Wasm init).
- [ ] Open OPFS SyncAccessHandle inside worker.
- [ ] Initialize empty SQLite file and schema table.
- [ ] Run basic read/write queries in worker.

**Ship Stop 1 — DB Worker Ready**
- Must-have instrumentation: DB worker latency metrics (p50/p95/p99).
- Validation: on-device test shows stable DB creation and queries.

## Phase 2 — Rust Data Layer + Schema
- [ ] Define SQLite schema for all IDB stores.
- [ ] Implement Rust DB API (batched ops, query_page, export/import).
- [ ] Add OPFS binary storage with SQLite metadata references.
- [ ] Add DB integrity checks (foreign keys, hashes).

**Ship Stop 2 — Feature Parity (No Migration)**
- Must-have instrumentation: DB op latency, memory usage, storage usage.
- Validation: all data operations work against SQLite with test data.

## Phase 3 — Migration Pipeline
- [ ] Build migration orchestrator (foreground-only).
- [ ] Add migration audit log table.
- [ ] Implement resumable checkpoints + error handling.
- [ ] Implement user backup export (JSON/CSV + file list).

**Ship Stop 3 — Migration Trial**
- Must-have instrumentation: migration progress + error counts + checksum stats.
- Validation: migration completes on device for sample dataset.

## Phase 4 — Cutover
- [ ] Switch reads/writes to SQLite.
- [ ] Keep IDB read-only fallback for one release.
- [ ] Remove IDB code paths after validation.
- [ ] Update SW to remove IDB usage and sync handler.

**Ship Stop 4 — Full Cutover**
- Must-have instrumentation: DB performance + storage pressure warnings.
- Validation: offline cold start works; no IDB reads remain.

## Phase 5 — Cleanup & Optimization
- [ ] Remove legacy IDB schemas from SW and Rust.
- [ ] Reduce precache payload size.
- [ ] Tune SQLite indexes and query plans.
- [ ] Finalize support runbooks and recovery paths.
