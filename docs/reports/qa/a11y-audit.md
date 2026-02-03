# Accessibility Audit (2026-02-03)

## Summary
- Scope: core navigation, settings, tuner, lesson pack, and rewards flows.
- Status: Manual pass completed. Automated tooling not run in this environment.

## Manual Checks
- Skip link present and focusable.
- Buttons with icon-only content have `aria-label`.
- Progress bars include `aria-label`.
- Offline and storage status messages use `aria-live="polite"`.
- Dialogs and popovers include `aria-label` and `aria-controls`.
- Tuner live direction uses text (“Higher/Lower/Perfect”) in addition to color.
- Tuner demo live region set to `aria-live="off"` to avoid excessive announcements.

## Risks / Follow-ups
- Run automated audits (axe, Lighthouse accessibility) during QA cycle.
- Verify focus order on iPad hardware (VoiceOver / keyboard).
- Consider adding meaningful alt text for reward badge images (currently decorative).

## Next Steps
- Add an automated accessibility check in CI when the test harness is ready.
