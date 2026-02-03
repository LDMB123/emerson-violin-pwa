# ADR-0013: Auto-Repair Cached Lesson Packs

- Status: accepted
- Date: 2026-02-03

## Context
- Lesson pack assets can be partially evicted or drift out of sync.
- Stale detection alone does not repair missing cached files.

## Decision
- On service worker activate and refresh, verify cached packs against manifests.
- Re-cache missing assets and notify the UI with `PACK_AUTO_REPAIR`.

## Consequences
- Adds background network work when online.
- Improves offline readiness without user intervention.
- Requires UI to surface partial/repair status.
