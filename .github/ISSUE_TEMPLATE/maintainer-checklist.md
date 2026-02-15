---
name: Maintainer takeover checklist
about: Standard checklist for onboarding a new maintainer to this repository
title: "[Maintainer] Takeover checklist - YYYY-MM-DD"
labels: documentation, maintenance
assignees: ""
---

## Context

- Date:
- Incoming maintainer:
- Outgoing maintainer:
- Scope of takeover:

## Environment Setup

- [ ] `npm install` completed successfully
- [ ] Rust toolchain installed
- [ ] `wasm32-unknown-unknown` target installed
- [ ] Trunk installed and available in PATH
- [ ] `npm run hooks:install` executed (optional but recommended)

## Baseline Validation

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run token:budget` reviewed
- [ ] `npm run dev` boots locally at `http://localhost:5173`

## Build and Release Readiness

- [ ] `npm run build` passes
- [ ] `npm run build:wasm-opt` passes (or explicitly skipped with reason)
- [ ] `npm run build:budgets` passes
- [ ] `npm run ios:bundle` run if iOS shell output is in scope

## Documentation and Ownership

- [ ] Reviewed `docs/HANDOFF.md`
- [ ] Reviewed `docs/README.md`
- [ ] Reviewed `scripts/README.md`
- [ ] Verified current priorities in `docs/rebuild-roadmap.md`
- [ ] Verified active risks in `docs/RISK_REGISTER_IPADOS_SAFARI.md`

## Open Work and Risks

- [ ] Known in-progress branches/PRs reviewed
- [ ] Unresolved incidents or regressions documented
- [ ] Critical technical debt items documented
- [ ] Follow-up tasks created for deferred work

## Sign-off

- [ ] Incoming maintainer confirms readiness
- [ ] Outgoing maintainer confirms handoff completeness

Notes:
