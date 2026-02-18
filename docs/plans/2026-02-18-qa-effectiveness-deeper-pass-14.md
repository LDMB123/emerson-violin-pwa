# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 17)

## Objective

Apply game-shell deactivation cleanup to `duet-challenge` so partner playback cannot continue after hash navigation away from the game view.

## Changes

### 1) Duet-Challenge Deactivation Hook

Updated:
- `src/games/duet-challenge.js`

Improvement:
- registered `gameState._onDeactivate` to:
  - stop partner playback
  - mark session inactive
  - disable response buttons until re-entry/reset

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- duet partner audio no longer continues across game hash deactivation
- deactivation behavior is now consistent across async-audio game modules
- full lint/audit/coverage/build/e2e gates remain green
