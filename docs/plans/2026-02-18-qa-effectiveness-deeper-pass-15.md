# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 18)

## Objective

Ensure short sample-audio games also participate in shell deactivation cleanup so audio cannot continue after hash navigation away.

## Changes

### 1) Ear Trainer Deactivation Hook

Updated:
- `src/games/ear-trainer.js`

Improvement:
- registered `gameState._onDeactivate` to clear current tone and stop/reset all sample audio elements

### 2) Tuning Time Deactivation Hook

Updated:
- `src/games/tuning-time.js`

Improvement:
- registered `gameState._onDeactivate` to stop/reset all string sample audio elements

## Verification

Passing commands:

```bash
npm run handoff:verify
```

## Result

- ear trainer and tuning time audio samples no longer carry across game hash deactivation
- deactivation behavior now consistent with other game lifecycle hardening passes
- full lint/audit/coverage/build/e2e gates remain green
