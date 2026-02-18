# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 13)

## Objective

Fix focus timer lifecycle behavior so hidden/pagehide states always pause an active session, even when the user remains on `#view-coach`.

## Changes

### 1) Focus Timer Stop Decision Helper

Added:
- `src/coach/focus-timer-utils.js`

New utility:
- `shouldStopFocusTimer({ isChecked, isCompleting, viewId, force })`

Behavior:
- stops only when timer is active and not in completing flow
- supports `force` to stop during lifecycle hide/unload events

### 2) Lifecycle Stop Fix in Focus Timer

Updated:
- `src/coach/focus-timer.js`

Improvements:
- `stopWhenInactive` now accepts `{ force }`
- `hashchange` keeps existing view-based behavior
- `visibilitychange` (hidden) and `pagehide` now force-stop active focus sessions

### 3) Unit Coverage

Added:
- `tests/focus-timer-utils.test.js`

Coverage additions:
- inactive and completing guard behavior
- coach-view non-force behavior
- off-coach and forced-stop positive cases

## Verification

Passing commands:

```bash
npx vitest run tests/focus-timer-utils.test.js
npm run handoff:verify
```

## Result

- focus timer no longer keeps running while the page is hidden
- hidden/pagehide lifecycle now reliably pauses active sessions
- full lint/audit/coverage/build/e2e gates remain green
