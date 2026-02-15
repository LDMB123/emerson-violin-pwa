# UI/UX Recovery PR Slices

This file defines the recommended 3-PR rollout for the student-first UI/UX recovery.

## PR1 - Visual foundation + class reconciliation (hotfix)

### Scope
- Restore complete class coverage and baseline responsiveness.
- Keep runtime hooks unchanged.

### Files
- index.html
- src/styles/app.css
- tests/e2e/app.spec.js

### Validation gate
- npm run lint
- npm test
- npx playwright test tests/e2e/app.spec.js

## PR2 - IA and navigation restructuring (student-first shell)

### Scope
- Student-first primary nav + More panel.
- Surface grouping (`data-surface`, `data-nav-group`, `data-more-panel`).
- Progressive disclosure for advanced diagnostics.

### Files
- index.html
- playwright.config.js
- tests/e2e/pwa-validation.spec.js

### Validation gate
- npm run lint
- npm test
- npm run test:e2e

## PR3 - Accessibility/perf hardening + visual regression + build guardrails

### Scope
- E2E stability hardening for SW/dev-host behavior.
- Visual regression coverage in CI.
- Dist-build promotion pipeline and budgets enforcement.

### Files
- .github/workflows/ci.yml
- package.json
- scripts/build/build-sw-assets.js
- scripts/build/promote-dist.js
- scripts/build/README.md
- scripts/build/budgets.json
- tests/e2e/visual.spec.js
- tests/e2e/visual.spec.js-snapshots/*
- tests/e2e/pwa-validation.spec.js

### Validation gate
- npm run lint
- npm test
- npm run test:e2e
- npm run test:visual
- npm run build:budgets

## QA notes from hardening pass

- `tests/e2e/pwa-validation.spec.js` is intentionally serial to avoid SW/cache cross-test interference.
- SW assertions branch on localhost because Rust intentionally disables SW in local dev hosts.
- `totalWasmKb` budget is kept strict at `900` (current measured: `853.1`).

## Recommended merge order

1. PR1
2. PR2
3. PR3

Do not squash across PR boundaries; each PR is designed to isolate rollback risk.

