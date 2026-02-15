# Build Scripts

- `build-sw-assets.js` generates `public/sw-assets.js` (dev) or `<dist>/sw-assets.js` (build via `--dist --dist-dir <dir>`).
- `copy-sqlite-wasm.js` ensures sqlite wasm assets are available to the app shell.
- `copy-pwa-to-ios.js` copies a build output folder (default `dist/`) into `native/ios/EmersonViolinShell/Resources/pwa`.
- `update-ios-plist.js` updates `PWAContentVersion` in iOS Info.plist sample (or real plist if present).
- `optimize-wasm.js` runs `wasm-opt -Oz` on built wasm artifacts in the selected dist folder.
- `check-budgets.js` validates build size budgets.
- `promote-dist.js` mirrors one build directory into another (used to promote `dist-build` to `dist`).
- `budgets.json` perf budget thresholds.
