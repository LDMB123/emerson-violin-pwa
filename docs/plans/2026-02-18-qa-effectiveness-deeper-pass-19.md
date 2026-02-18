# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 22)

## Objective

Bring non-shell game implementations in line with shell lifecycle hardening by adding bfcache-safe `pagehide` behavior and resilient listener rebind handling.

## Changes

### 1) Sequence Game Pagehide Handling

Updated:
- `src/games/sequence-game.js`

Improvement:
- added `pagehide` listener lifecycle management
- on non-persisted `pagehide` for active sequence-game views:
  - stop active tone playback
  - report current session
- ignores persisted (`bfcache`) pagehide snapshots

### 2) Rhythm Dash Lifecycle Handler Cleanup + Pagehide

Updated:
- `src/games/rhythm-dash.js`

Improvement:
- added explicit listener cleanup before rebind for:
  - `hashchange`
  - `visibilitychange`
  - `SOUNDS_CHANGE`
  - `pagehide`
- added non-persisted `pagehide` handling for active view:
  - stop active run and report if needed
  - stop metronome/report when not actively running
- ignores persisted (`bfcache`) pagehide snapshots

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- non-shell games (`pizzicato`, `string-quest`, `rhythm-dash`) now deactivation-report safely on real page unload
- bfcache behavior remains protected
- listener lifecycle is more robust in `rhythm-dash` across potential rebind scenarios
- full lint/audit/coverage/build/e2e gates remain green
