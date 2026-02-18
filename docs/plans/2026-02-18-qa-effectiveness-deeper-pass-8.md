# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 11)

## Objective

Harden trainer page lifecycle behavior for bfcache restores by avoiding destructive posture cleanup during persisted `pagehide` events.

## Changes

### 1) bfcache Pagehide Helper

Updated:
- `src/trainer/trainer-utils.js`

Added:
- `isBfcachePagehide(event)`

Behavior:
- returns `true` when a `pagehide`-like event indicates `persisted === true` (bfcache snapshot)

### 2) Trainer Lifecycle Guard

Updated:
- `src/trainer/tools.js`

Improvement:
- posture `pagehide` handler now skips report + preview cleanup for persisted events
- prevents unintended state loss when navigating away and restoring from bfcache

### 3) Unit Coverage

Updated:
- `tests/trainer-utils.test.js`

Coverage additions:
- `isBfcachePagehide` true/false/empty/null cases

## Verification

Passing commands:

```bash
npx vitest run tests/trainer-utils.test.js
npm run lint:all
npm run qa:effectiveness
```

## Result

- trainer lifecycle now better respects bfcache restores
- posture transient state is preserved across persisted snapshots
- lint and QA effectiveness gates remain green
