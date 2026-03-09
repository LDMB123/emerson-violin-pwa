# Release Checklist

## Pre-merge

- Require the `quality` GitHub Actions check before merging to `main`.
- Require one engineering reviewer and no direct pushes to `main`.
- Run:
  ```bash
  npm run runtime:check
  npm run audit:full
  npm audit --omit=dev --audit-level=high
  npm run audit:perf
  npm run handoff:verify
  ```

## Feature-completeness signoff

- Confirm `npm run audit:feature-parity` passes.
- Confirm `npm run audit:release-tests` passes.
- Confirm all 40 songs support detail, play, and record entrypoints.
- Confirm all 17 games open, initialize, change score/state, and return to the hub.
- Confirm the 5 tools plus coach runner work from the installed child-facing flow.

## Deploy

- Merge to `main` only after the signoff matrix is complete:
  - Engineering signoff
  - QA signoff
  - Installed-iPad product/owner signoff
- GitHub Pages deploys from `.github/workflows/pages.yml`.
- Post-deploy smoke must pass against the live URL before the release is accepted.

## Post-deploy checks

- Live smoke:
  ```bash
  PW_BASE_URL=\"https://<your-live-url>/\" PW_SKIP_WEBSERVER=true npm run test:e2e:live
  ```
- Manual installed-iPad pass:
  - Add to Home Screen
  - Cold launch from icon
  - Run one song, one game, and one tool
  - Resume coach after backgrounding
  - Offline relaunch through Home, Songs, Games, Tools

## Rollback

- Roll back by redeploying the previous known-good `main` commit through the Pages workflow.
- Record:
  - release commit SHA
  - rollback target SHA
  - live URL
  - verification timestamp
  - accepted risks
