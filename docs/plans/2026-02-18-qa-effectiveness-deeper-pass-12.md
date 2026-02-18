# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 15)

## Objective

Apply the new game deactivation lifecycle hook to `story-song` so play-along audio does not continue across hash navigation away from the game view.

## Changes

### 1) Story-Song Deactivation Hook

Updated:
- `src/games/story-song.js`

Improvement:
- registered `gameState._onDeactivate` to stop play-along on shell-driven hash deactivation
- ensures active playback is paused before leave reporting logic runs

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- story-song play-along no longer continues after hash navigation away
- deactivation behavior now aligns with the shell lifecycle hook model
- full lint/audit/coverage/build/e2e gates remain green
