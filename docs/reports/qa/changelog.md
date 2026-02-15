# QA Changelog

## 2026-02-15

### iPad Safari-only QA and screenshot platform cleanup (pass 1)

- Removed Chromium/iPhone-focused QA paths from active configuration and tooling.
- Kept only iPad Safari test coverage in Playwright:
  - `playwright.config.js` now defines only the `iPad Safari` project.
  - `scripts/qa-screenshots.mjs` now uses WebKit only with iPad viewport presets.
- Verified via:
  - `npm test` (pass)
  - `npm run lint` (pass)
  - `npx playwright test tests/e2e` (9 passed, 0 failed; iPad Safari only)

### Suggested commit message bundle

- `chore(test): drop legacy Chromium/iPhone QA platforms`
- `test: pin e2e suite to iPad Safari only`
- `docs: add QA changelog note for Safari-only consolidation`
