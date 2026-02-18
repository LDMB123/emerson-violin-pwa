# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 20)

## Objective

Close remaining synthesized-tone lifecycle gaps so sequence and timer mini-games stop active tone playback immediately on deactivation/reset.

## Changes

### 1) Sequence Game Factory Tone Cleanup

Updated:
- `src/games/sequence-game.js`

Improvement:
- imported `stopTonePlayer`
- stop synthesized tone playback during session reset and when hash navigation leaves the game view
- covers both sequence-factory consumers: `pizzicato` and `string-quest`

### 2) Note Memory Deactivation Tone Cleanup

Updated:
- `src/games/note-memory.js`

Improvement:
- extended `gameState._onDeactivate` to call `stopTonePlayer` in addition to pausing the timer

### 3) Bow Hero Deactivation Tone Cleanup

Updated:
- `src/games/bow-hero.js`

Improvement:
- imported `stopTonePlayer`
- extended `gameState._onDeactivate` to stop tone playback in addition to pausing timer state

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- sequence and timer mini-games no longer allow synthesized tones to continue after deactivation/reset
- tone cleanup behavior is now aligned across deactivation-hardened game modules
- full lint/audit/coverage/build/e2e gates remain green
