# Project Status / Handoff — iPad mini 6 (A15) · iPadOS 26.2 · Safari 26.2
Date: 2026-02-05  
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa`

## Target Runtime (Hard Constraints)
- Optimize ONLY for:
  - iPad mini 6 (A15)
  - iPadOS 26.2
  - Safari 26.2
  - secure context guaranteed (https/localhost)
- No backward compatibility requirements (ignore older iOS/Safari, other browsers, desktop).
- Safari realities we must design around:
  - No Background Sync / Periodic Background Sync.
  - Storage quota is variable; eviction is real even for installed apps.
  - OPFS is available; high-performance IO should happen in workers.
  - Wasm SIMD assumed; Wasm threads are optional and must be risk-managed with on-device validation.

## Where We Left Off

### Git State
- Branch: `codex/audit-rust-transition-ipados`
- Latest commits:
  - `45f0590` docs: update handoff status
  - `ca94fd3` pwa: harden share staging, PDF offline gating, diagnostics
  - `5beb56c` ui: expose migration verification + IDB purge
  - `6d4fc92` pwa: push reminders, share staging stats, update docs
  - `6235eef` pwa: add persistence request button
  - `6e8dc30` diagnostics: add db latency percentiles
  - `0fe1a34` storage: surface quota errors
- Working tree was clean at last check.

### Toolchain + Scripts
- Node: `>=20` (see `package.json`)
- Rust: stable for default build; nightly is required only for `--features wasm-threads`.
- Trunk: required (`cargo install trunk`)
- Rust target: `wasm32-unknown-unknown`
- High-signal scripts:
  - `npm run dev` Trunk dev server
  - `npm run build` production build
  - `npm run build:threads` production build with Wasm threads (nightly; COOP/COEP required)

### Production Headers (Cross-Origin Isolation)
- Dev: `Trunk.toml` serves COOP/COEP headers (and disables CSP for dev convenience).
- Prod: `public/_headers` contains the expected COOP/COEP/CORP + CSP policy for static hosting.

### Current Architecture (What’s True Now)
- App shell + most logic: Rust/Wasm.
- Service Worker: intentionally minimal; optimized for iPadOS SW termination + storage pressure.
- Structured data source of truth (target): SQLite persisted in OPFS, accessed via a dedicated worker.
- Migration posture: IDB and SQLite coexist until verification passes; cutover is gated on checksums.
- Storage mode selection: SQLite-first on fresh installs; legacy IDB stays active only when it has data and migration is pending.
- Binary storage (recordings/models/shared blobs): OPFS files; metadata stored in SQLite once migrated.
- IndexedDB usage is allowed only for:
  - Legacy migration source (`emerson-violin-db` v5) until verified.
  - Minimal SW-local share-target staging (`emerson-share-inbox`) to bridge “share into app while closed”.

## What Was Implemented (High Signal)

### Offline / Service Worker
- Boot cache vs optional PDF pack:
  - Boot cache: `emerson-violin-shell-v204`
  - Pack cache: `emerson-violin-packs-v204`
  - PDFs are excluded from boot precache and can be cached on-demand as a pack.
- SW now treats `/api/*` as **network-only** (no caching).
- Pack caching reports `cached / expected / failed` counts.
- Share-target staging:
  - SW stores share payloads in SW-local IDB.
  - SW can report staging stats and can be cleared from the app UI.
  - Staging has an entry-count retention cap to prevent unbounded growth while the app is closed.

Key files:
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/public/sw.js`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/scripts/build/build-sw-assets.js`

### SQLite OPFS Worker + Rust DB Client
- Dedicated worker uses `@sqlite.org/sqlite-wasm` OPFS database:
  - `new sqlite.oo1.OpfsDb('emerson.db', 'c')`
- Rust owns schema and migrations and pushes them into the worker at init.
- DB latency percentiles (p50/p95/p99) are surfaced in the UI.
- DB worker errors now include quota detection and timing.

Key files:
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/public/db-worker.js`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/db_schema.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/db_client.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/db_messages.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/db_migration.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/db_worker.rs`

### Storage Pressure / Quota
- `navigator.storage.estimate()` surfaced, plus `persisted()` state.
- Persistent storage request:
  - auto request (`rust/platform.rs`)
  - user-gesture “Request persistence” button (`rust/pwa.rs`)
- Quota-like errors are detected across:
  - OPFS (main thread)
  - IDB requests
  - SQLite worker errors
- When quota pressure is detected, the UI is marked `Critical` and a toast instructs cleanup/export.
- Auto cleanup is triggered when storage usage reaches >= 90% (hourly gated).

Key files:
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/pwa.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/storage_pressure.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/storage_cleanup.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/storage.rs`

### Share Inbox Hardening
- UI shows:
  - app-level share inbox list/count
  - SW staging count and newest timestamp
  - “Clear SW staging” button
- Badging includes share inbox items as a badge source.

Key files:
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/share_inbox.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/index.html`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/public/sw.js`

### Push Reminders (Client + SW Handlers)
- Client side reminders are wired (installed-only, explicit enable click):
  - request notification permission
  - fetch VAPID public key from `/api/push/public-key`
  - subscribe via PushManager
  - POST subscription to `/api/push/subscribe`
  - POST schedule to `/api/push/schedule`
  - if scheduling fails, reminders go “pending” and retry on next online/foreground
- SW handlers added:
  - `push`: showNotification and optional badge update
  - `notificationclick`: focus/navigate or open window

Important: the backend contract is NOT implemented in this repo, so reminders are not end-to-end until a server exists.

Key files:
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/reminders.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/public/sw.js`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/public/config.json`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/config.rs`

### Migration UX
- UI now shows:
  - migration status line
  - checksums status line
  - “legacy IDB” status line
  - “Purge legacy IDB” button (disabled until migration verified)
  - DB mode line (`SQLite (verified)` vs `IDB fallback …`)
- Purge action requires explicit confirmation.

Key files:
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/db_migration.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/rust/storage.rs` (IDB purge gating)
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/index.html`

## Docs (Updated and Should Be Treated as Current)
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/docs/AUDIT_OFFLINE_PWA_IPADOS_SAFARI.md`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/docs/TRANSITION_PLAN_RUST_FIRST_IPADOS_SAFARI.md`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/docs/MIGRATION_CHECKLIST_IPADOS_SAFARI.md`
- `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/docs/RISK_REGISTER_IPADOS_SAFARI.md`

## How To Run / Verify Locally
- Tests:
  - `npm test`
- Release build (Trunk + SW asset manifest):
  - `npm run build`
- Dev server:
  - `npm run dev`
- Threads build (optional, risk-managed):
  - `npm run build:threads`

## On-Device Dev Note (iPad Safari)
Service Workers and Push require a secure context. iPad Safari does not treat `http://<LAN-IP>` as secure.

- Use HTTPS for on-device testing:
  - `trunk serve --address 0.0.0.0 --port 5173 --tls-cert-path <cert> --tls-key-path <key>`
  - Use a LAN hostname that matches the cert (or deploy to a real HTTPS URL).

## On-Device Validation Checklist (iPad mini 6)
Use Safari Web Inspector.

1. Install as Home Screen web app.
2. First online boot:
  - Ensure SW registers.
  - Check Cache Storage for `emerson-violin-shell-*`.
  - Verify `navigator.storage.persisted()` state in UI.
3. Offline cold start:
  - Airplane mode, launch installed web app.
  - Confirm boot succeeds and core UI loads.
4. DB worker:
  - Init DB worker, confirm DB file and schema version.
  - Observe DB latency p50/p95/p99 populate.
5. Migration:
  - Run migration.
  - Confirm checksums OK.
  - Only then purge legacy IDB.
6. Share-target:
  - Share a file into the app while app is closed.
  - On next open: verify SW staging count decreases and item appears in Share inbox.
7. Storage pressure:
  - Fill storage (or simulate large recordings) until near quota.
  - Confirm quota-like errors surface “storage pressure” and auto cleanup attempts.
8. PDF pack:
  - Cache PDF pack and verify offline PDF loads.
9. Push reminders (requires backend):
  - Enable reminders, verify subscription + schedule calls succeed, push arrives.

## Next 10 Concrete Tasks (Recommended)
1. Implement the push backend contract (external to this repo):
  - `GET /api/push/public-key`
  - `POST /api/push/subscribe`
  - `POST /api/push/schedule`
2. Add a threads build stress harness (only if threads build is going to be shipped).
3. Final cutover hardening:
  - after verification, remove app-level IDB structured-data fallback codepaths
  - keep minimal SW IDB staging only
4. Add an explicit migration call-to-action for existing IDB users:
  - detect legacy data and prompt “Run migration now” with a clear time/size estimate.
5. Add on-device “storage pressure drill” page:
  - generate dummy OPFS blobs and validate cleanup/export UX.
6. Add a share-target staging payload size cap (MB) in SW in addition to entry count.
7. Add end-to-end on-device test script/checklist for COOP/COEP + threads build stability.
8. Add a release gate: block SW update if DB worker init fails (avoid UI/DB mismatch).
9. Decide if the app should auto-migrate on first launch for legacy users (vs user-initiated).
10. Tighten PDF UX:
  - show a persistent hint in the score UI when offline and the PDF pack is not cached.
