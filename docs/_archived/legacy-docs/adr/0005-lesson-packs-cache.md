# ADR-0005: Lesson Pack Caching

- Status: accepted
- Date: 2026-02-03

## Context
- Offline-first requirement includes explicit lesson pack downloads
- Need user-visible progress and control without network calls at runtime
- Existing service worker already precaches core assets

## Decision
- Add optional lesson pack UI in Settings
- Use service worker messaging to cache pack assets
- Pack readiness based on assets cached in app cache or pack cache
- Allow clearing packs without removing core app shell

## Consequences
- Users can verify offline readiness for optional assets
- Pack downloads are explicit and track progress
- Some assets may already be cached via app shell
