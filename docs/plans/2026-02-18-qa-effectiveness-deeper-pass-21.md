# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 24)

## Objective

Add explicit regression coverage for recently-hardened `sequence-game` lifecycle behavior to prevent future breakage in non-bfcache/bfcache `pagehide` handling and bind-cycle listener cleanup.

## Changes

### 1) New Sequence Game Lifecycle Tests

Added:
- `tests/games/sequence-game.test.js`

Coverage added for:
- non-persisted `pagehide` on active view:
  - stops tone playback
  - reports the in-progress session
- persisted (`bfcache`) `pagehide`:
  - does not stop tones
  - does not report session
- rebind behavior:
  - old `pagehide` listeners are removed before rebind to prevent duplicate handling

## Verification

Passing commands:

```bash
npx vitest run tests/games/sequence-game.test.js
npm run handoff:verify
```

## Result

- sequence-game lifecycle behavior is now guarded by dedicated regression tests
- non-shell lifecycle hardening work is now covered by automated verification
- full lint/audit/coverage/build/e2e gates remain green
