# Scripts

- `build/build-sw-assets.js` generate `public/sw-assets.js` (dev) or `dist/sw-assets.js` (build)
- `build/check-budgets.js` validate build size budgets
- `build/budgets.json` perf budget thresholds
- `build/copy-pwa-to-ios.js` copy `dist/` into `native/ios/EmersonViolinShell/Resources/pwa`
- `dev/start-preview.sh` start simple HTTP preview server
- `qa/qa-screenshots.mjs` capture QA screenshots into `docs/reports/qa/screenshots/`
- `qa/perf-report.js` convert perf JSON into a markdown report
- `qa/perf-bundle.js` bundle perf JSON + report + build meta + screenshots
- `maintenance/cleanup-organization.sh` repo cleanup + archive helpers
- `maintenance/prune-legacy.js` remove legacy coaching/teaching/games code + assets
