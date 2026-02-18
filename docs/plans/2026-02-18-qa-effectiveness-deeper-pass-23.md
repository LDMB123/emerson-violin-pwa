# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 26)

## Objective

Harden all service-worker-dependent flows so the app behaves safely on unsupported browsers and insecure non-localhost contexts.

## Changes

### 1) Shared SW Support Rules

Added:
- `src/platform/sw-support.js`

Capabilities:
- feature detection via `hasServiceWorkerSupport()`
- registration eligibility via `canRegisterServiceWorker()` with secure-context + localhost rules

### 2) Guarded SW-dependent Runtime Paths

Updated:
- `src/app.js`
- `src/platform/offline-recovery.js`
- `src/platform/offline-mode.js`
- `src/platform/offline-integrity.js`
- `src/platform/sw-updates.js`

Behavior:
- avoid calling `navigator.serviceWorker` APIs when unsupported
- avoid registration attempts when context is not eligible
- surface safe UI status for unsupported environments instead of throwing runtime errors

### 3) Added Regression Coverage

Added:
- `tests/sw-support.test.js`

Coverage includes:
- support detection truth table
- secure/insecure + localhost registration eligibility rules

## Verification

Passing commands:

```bash
npx vitest run tests/sw-support.test.js
npm run handoff:verify
```

## Result

- service-worker feature paths now fail safe across unsupported/ineligible contexts
- production gates remain green (lint, deadcode, deps audit, coverage thresholds, build, e2e)
