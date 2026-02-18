# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 19)

## Objective

Ensure tone-synth games participate in shell deactivation cleanup so synthesized notes cannot continue after hash navigation away.

## Changes

### 1) Scale Practice Deactivation Hook

Updated:
- `src/games/scale-practice.js`

Improvement:
- imported `stopTonePlayer` and registered `gameState._onDeactivate` to stop active synthesized playback

### 2) Pitch Quest Deactivation Hook

Updated:
- `src/games/pitch-quest.js`

Improvement:
- imported `stopTonePlayer` and registered `gameState._onDeactivate` for synthesized playback cleanup

### 3) Rhythm Painter Deactivation Hook

Updated:
- `src/games/rhythm-painter.js`

Improvement:
- imported `stopTonePlayer` and registered `gameState._onDeactivate` for synthesized playback cleanup

### 4) Duet Challenge Tone Cleanup

Updated:
- `src/games/duet-challenge.js`

Improvement:
- extended existing deactivation hook to also call `stopTonePlayer` alongside partner playback shutdown

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- synthesized tone playback no longer carries across game hash deactivation in scale-practice, pitch-quest, rhythm-painter, and duet-challenge
- deactivation behavior is now consistent across sample-audio and tone-synth mini-games
- full lint/audit/coverage/build/e2e gates remain green
