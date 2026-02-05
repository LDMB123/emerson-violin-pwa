# Risk Register — iPad mini 6 (A15) · iPadOS 26.2 · Safari 26.2
Date: 2026-02-05

| Risk | Likelihood | Impact | Mitigation | Signals / Monitoring |
|---|---|---|---|---|
| Storage quota/eviction (installed apps included) | High | High | Use `navigator.storage.estimate()` + `persisted()` UI; request persistence (`persist()` auto + gesture button); auto cleanup on >=90% usage; export/import recovery paths | Usage trending upward; sudden missing OPFS files; quota-like errors |
| QuotaExceededError during large writes | Medium | High | Detect quota-like failures across OPFS + IDB + SQLite worker; surface “storage pressure” and prompt cleanup/export | `storage:last-error-*` set; DB worker `quota=true` errors |
| OPFS edge cases (device-only behavior) | Medium | High | Keep OPFS test harness (main thread + worker); prefer worker-owned DB IO; keep narrow IDB blob fallback for critical paths | OPFS tests fail; missing files; errors in logs |
| SW termination mid-task | High | Medium | Keep SW operations short and best-effort; no long migrations/sync in SW; pack caching reports partial success | Partial pack caching; missing cached entries |
| SW update timing + schema mismatch | Medium | High | Gate SW update apply on migration verification; keep migration foreground-only | Update banner blocked; migration incomplete |
| Dual-store drift (IDB vs SQLite during migration window) | Medium | High | Centralize gating (`should_use_sqlite()`); keep IDB as migration source until checksums verified; purge IDB after cutover | Checksums mismatch; row count mismatch; unexpected IDB writes post-cutover |
| Migration failure / partial state | Medium | High | Resumable checkpoints; migration log table + export; do not delete IDB until verified | Migration errors; repeated restarts; stalled `last_key` |
| Memory pressure / jetsam (Safari termination) | High | High | Avoid main-thread OPFS IO; batch DB calls; cap ML trace retention; avoid large in-memory buffers | App reloads unexpectedly; long-task spikes; rising memory footprint |
| Cross-origin isolation deployment risks | Medium | Medium | Validate COOP/COEP headers in prod; capability scan includes COI; keep non-threads build as primary | `crossOriginIsolated=false`; SAB unavailable |
| Wasm threads instability (Safari) | Medium | Medium | Runtime gating already present; require on-device long-session tests before relying on threads; keep single-thread fallback build | Hangs/crashes only on threads build |
| Push permission friction (installed-only behavior) | Medium | Medium | Require install before enabling reminders; permission prompt only after explicit user gesture | Low grant rate; “denied” permission state |
| Push backend absent/mismatched contract | Medium | Medium | Treat reminders as “pending” when scheduling fails; document required `/api/push/*` endpoints | Reminders stuck pending; schedule call non-2xx |
| Cache bloat (boot cache too large) | Medium | Medium | Keep boot allowlist tight; move heavy assets into optional packs; expose pack status and clear packs | Cache entry counts spike; eviction events; offline boot failures |
| Share-target staging stuck in SW IDB | Low | Medium | SW staging stats + clear staging button; request delivery on refresh and on boot | Staging count non-zero for long periods; missing shared items |

