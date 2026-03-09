# Documentation Map

Use this file to decide which document to read before editing or validating the repo.

## Live Docs

- [README.md](../README.md)
  - Project overview, core commands, quality gates, and layout
- [CONTRIBUTING.md](../CONTRIBUTING.md)
  - Maintainer workflow, documentation contract, and required checks
- [CLAUDE.md](../CLAUDE.md)
  - Repo-specific engineering rules, runtime caveats, and implementation notes
- [docs/HANDOFF.md](HANDOFF.md)
  - Zero-context pickup runbook, verification sequence, and Playwright worker calibration

## Architecture

- [docs/architecture/system-overview.md](architecture/system-overview.md)
  - App shell, routing, view loading, and module bootstrap
- [docs/architecture/feature-surface.md](architecture/feature-surface.md)
  - Experience-area ownership and view/module responsibilities
- [docs/architecture/offline-and-persistence.md](architecture/offline-and-persistence.md)
  - Storage model, service worker ownership, and offline guarantees
- [docs/architecture/audio-and-realtime.md](architecture/audio-and-realtime.md)
  - Audio stack, WASM/runtime layers, and realtime session ownership

## Guides

- [docs/guides/asset-optimization.md](guides/asset-optimization.md)
  - Production asset optimization workflow and rollback steps
- [docs/guides/safari-ipad-test-guide.md](guides/safari-ipad-test-guide.md)
  - Manual Safari / iPad device validation
- [docs/guides/xcode-simulator-testing.md](guides/xcode-simulator-testing.md)
  - Simulator-first validation before physical-device testing

## Specialized Workspaces

- [imagen/README.md](../imagen/README.md)
  - Red panda art-generation workspace rules

## Historical Material

- [docs/architecture/next-reboot-target-state.md](architecture/next-reboot-target-state.md)
  - Historical React reboot target-state snapshot; not the live routing/runtime source of truth
- [docs/architecture/reboot-feature-matrix.md](architecture/reboot-feature-matrix.md)
  - Historical migration tracker retained for reboot context; not the current feature inventory
- [docs/ViolinPLANV2.md](ViolinPLANV2.md)
  - Historical reboot planning document retained for decision history, not day-to-day maintenance
- [_archived/plans/README.md](../_archived/plans/README.md)
  - Why old plan files were pruned and why no live plan directory remains in the repo

## Source Of Truth

- Commands and quality gates: [package.json](../package.json)
- Installed app metadata: [public/manifest.webmanifest](../public/manifest.webmanifest)
- GitHub Pages SPA fallback build step: `scripts/build-spa-fallback.mjs` -> `dist/404.html`
- Current route inventory: `src/routes.jsx` and `src/views/`
- Embedded legacy game/song HTML surfaces: `public/views/`
- Current automation and audit scripts: `scripts/`
- Documentation freshness guard: `npm run audit:docs`

Treat generated counts, route lists, and performance outputs from the current checkout as authoritative over older prose snapshots.
