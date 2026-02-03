# Accessibility Audit (2026-02-03)

## Summary
- Scope: core navigation, settings, tuner, and lesson pack flows.
- Status: Manual pass completed. Automated tooling not run in this environment.

## Manual Checks
- Skip link present and focusable.
- Buttons with icon-only content have `aria-label`.
- Progress bars include `aria-label`.
- Offline and storage status messages use `aria-live="polite"`.
- Dialogs and popovers include `aria-label` and `aria-controls`.

## Risks / Follow-ups
- Run automated audits (axe, Lighthouse accessibility) during QA cycle.
- Verify focus order on iPad hardware (VoiceOver / keyboard).

## Next Steps
- Add an automated accessibility check in CI when the test harness is ready.
