# ADR-0006: Service Worker Update Strategy

- Status: accepted
- Date: 2026-02-03

## Context
- App is used by a child; avoid surprise UI changes
- Service worker was calling `skipWaiting()` on install
- Controller change could trigger unexpected reloads

## Decision
- Remove automatic `skipWaiting()` on install
- Apply updates only after explicit user action
- Reload only when user taps Apply Update

## Consequences
- Predictable updates for parents/kids
- Update may wait until user applies
- Slightly longer time to receive fixes
