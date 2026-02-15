# Documentation Conventions

Last updated: 2026-02-15

## Scope

Applies to Markdown docs under `docs/`, plus repository-level onboarding docs (`README.md`, `scripts/README.md`).

## File Naming

- Use kebab-case for filenames.
- Prefix sequence docs when order matters (`02-ia-map.md`, `03-user-flows.md`).
- Use dated filenames for plans: `YYYY-MM-DD-topic.md`.
- Keep archived material under `docs/_archived/legacy-docs/`.

## Header Format

- First line must be a single H1: `# Title`.
- Second metadata line should be: `Last updated: YYYY-MM-DD`.
- Prefer concise, stable titles without dates in the heading itself.

## Section Structure

- Start with user goal/context before implementation details.
- Use short sections and single-level bullet lists.
- Prefer command-first snippets for operational docs.
- Keep one source of truth per topic and link to it from index docs.

## Linking Rules

- Use repository-relative paths for internal references (for example: `docs/HANDOFF.md`).
- Avoid duplicate explanations; link to canonical docs instead.
- Update `docs/README.md` whenever new top-level docs are added.

## Handoff and Operations

- Keep takeover flow in `docs/HANDOFF.md`.
- Keep script inventory in `scripts/README.md`.
- Keep architecture source of truth in `docs/rebuild/05-architecture.md`.

## Update Policy

- Update `Last updated` when content meaningfully changes.
- For wide sweeps, keep changes mechanical and avoid semantic rewrites unless needed.
- Run validation after doc updates:

```bash
npm run lint
npm test
```
