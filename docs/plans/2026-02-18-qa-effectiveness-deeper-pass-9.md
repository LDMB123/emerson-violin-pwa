# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 12)

## Objective

Avoid metronome lifecycle side effects during bfcache snapshots by guarding persisted `pagehide` events.

## Changes

### 1) Metronome bfcache Guard

Updated:
- `src/trainer/tools.js`

Improvement:
- metronome `pagehide` handler now returns early for persisted events (`event.persisted === true`)
- prevents unnecessary metronome report/stop side effects during bfcache navigation

### 2) Shared Lifecycle Heuristic

Reused:
- `src/trainer/trainer-utils.js` (`isBfcachePagehide`)

Improvement:
- metronome and posture pagehide paths now follow the same bfcache-aware behavior

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- trainer metronome lifecycle is now bfcache-aware
- avoids persisted-pagehide over-reporting while preserving existing non-bfcache cleanup behavior
- full lint/audit/test/build/e2e gates remain green
