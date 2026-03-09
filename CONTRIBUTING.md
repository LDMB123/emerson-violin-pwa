# Contributing

Use this file for repo maintenance expectations. Use `README.md` for setup, `docs/README.md` for document discovery, and `docs/HANDOFF.md` for verification/handoff flow.

GitHub pull requests should use [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) so validation, docs impact, UI evidence, and rollback notes stay consistent.

## Documentation Contract

Keep documentation updates in the same PR when you change:

- npm scripts, local commands, or CI verification flow
- source-of-truth file locations or generated asset paths
- view inventory, routing, or module ownership rules
- persistence, offline, service worker, audio, or realtime architecture behavior
- operator workflows for Safari/iPad, simulator, or handoff validation

If a code change does not require documentation changes, say so explicitly in the PR description.

## Doc Ownership

- `README.md`: entrypoint for setup, key commands, and where to look next
- `docs/README.md`: canonical documentation map
- `docs/HANDOFF.md`: zero-context operator runbook and verification flow
- `docs/architecture/`: maintainable subsystem overviews and source-of-truth pointers
- `CLAUDE.md`: repo-specific engineering caveats and implementation gotchas
- `docs/guides/`: targeted workflows and platform-specific validation guides

Avoid copying the same operational fact into multiple files. Prefer linking to the source-of-truth doc.

## Required Checks

Run the relevant checks before merging:

```bash
npm run audit:docs
npm run audit:static
npm run handoff:verify
```

`audit:docs` is the fast freshness guard for live Markdown and JSDoc contracts. `audit:static` includes it.

## Writing Rules

- Start with the maintainer goal, not the module internals
- Prefer working commands and current file paths over screenshots or historical counts
- Do not hard-code fast-moving counts for views, songs, or features unless a check keeps them in sync
- Treat `_archived/` scratch paths as optional/local unless the files are tracked in git
- Keep architecture docs high-signal; do not mirror every exported function
