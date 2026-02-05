# Risk Register — iPad mini 6 (A15) • iPadOS 26.2 • Safari 26.2
Date: 2026-02-05

| Risk | Likelihood | Impact | Mitigation | Signals / Monitoring |
|---|---|---|---|---|
| Storage quota/eviction | High | High | Use `storage.estimate()` and `persisted()`; request persistence; warn users; add cleanup tooling and quotas | Unexpected data loss, storage usage > 80% |
| OPFS edge cases (permissions, API quirks) | Medium | High | On-device OPFS test harness; fallback to IDB blobs for critical paths | OPFS errors in logs, missing files |
| SW termination / update timing | High | Medium | Keep SW tasks short; avoid long migrations in SW; do migrations in app | Incomplete SW tasks, partial cache updates |
| Migration failures / partial state | Medium | High | Resumable migration with checkpoints + audit log; user backup before migration | Migration log errors; row count mismatch |
| Cross-origin isolation deployment risks | Medium | Medium | Validate COOP/COEP headers in prod; add CI check | SharedArrayBuffer unavailable |
| Wasm threads instability | Medium | Medium | Gate threads; fallback to single-threaded; test on device | Crashes or hangs in worker |
| Memory pressure / jetsam | High | High | Limit in-memory caches; stream data; cap ML traces; avoid large blobs in memory | Sudden app termination, crash logs |
| Push permission friction | Medium | Medium | Defer prompt until value is clear; provide reminders without push | Low permission grant rates |
| Background Sync assumption | High | Medium | Remove reliance; do sync on foreground/resume only | No sync events on Safari |
| Cache bloat (precached assets) | Medium | Medium | Reduce precache set; split optional assets | Cache size spikes, eviction |
| Schema drift (IDB vs SQLite) | Medium | High | Single source of truth schema; automated migration tests | Data mismatches |
| OPFS + SQLite contention | Medium | Medium | Single DB worker; serialize write access | DB locks, timeouts |
| User not installed | High | Medium | Install-first onboarding; reduce expectations for non-installed users | Lower offline success rate |
