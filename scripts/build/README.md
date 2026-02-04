# Build Scripts

- `build-sw-assets.js` generates `public/sw-assets.js` (dev) or `dist/sw-assets.js` (build).
- `generate-pwa-manifest.js` creates `pwa-manifest.json` with SHA-256 hashes.
- `copy-pwa-to-ios.js` copies `dist/` into `native/ios/EmersonViolinShell/Resources/pwa`.
- `update-ios-plist.js` updates `PWAContentVersion` in iOS Info.plist sample (or real plist if present).
- `check-budgets.js` validates build size budgets.
- `budgets.json` perf budget thresholds.
