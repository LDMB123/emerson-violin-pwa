# Build Scripts

- `build-sw-assets.js` generates `public/sw-assets.js` (dev) or `dist/sw-assets.js` (build).
- `copy-sqlite-wasm.js` ensures sqlite wasm assets are available to the app shell.
- `copy-pwa-to-ios.js` copies `dist/` into `native/ios/EmersonViolinShell/Resources/pwa`.
- `update-ios-plist.js` updates `PWAContentVersion` in iOS Info.plist sample (or real plist if present).
- `optimize-wasm.js` runs `wasm-opt -Oz` on built `dist/*.wasm` artifacts when Binaryen is available.
- `check-budgets.js` validates build size budgets.
- `budgets.json` perf budget thresholds.
