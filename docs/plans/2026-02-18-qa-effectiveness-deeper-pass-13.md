# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 16)

## Objective

Apply the shell deactivation lifecycle hook to `melody-maker` so active melody playback does not continue across hash navigation away from the game view.

## Changes

### 1) Melody-Maker Deactivation Hook

Updated:
- `src/games/melody-maker.js`

Improvement:
- registered `gameState._onDeactivate` to stop active melody playback when shell deactivates the game on hash leave
- ensures audio playback is halted before leave reporting logic executes

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- melody-maker playback no longer continues after hash navigation away
- deactivation behavior now aligns with story-song/note-memory/bow-hero lifecycle hardening
- full lint/audit/coverage/build/e2e gates remain green
