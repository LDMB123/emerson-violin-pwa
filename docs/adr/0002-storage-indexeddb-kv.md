# ADR-0002: IndexedDB KV + Blob Storage

- Status: accepted
- Date: 2026-02-03

## Context
- Offline-first requirement for practice data and recordings
- Need minimal dependency surface and predictable storage control
- Safari storage persistence needs explicit handling

## Decision
- Keep custom IndexedDB KV store and blob store
- Use manual migrations per DB version
- Avoid Dexie until schema complexity justifies dependency

## Consequences
- More manual IDB code to maintain
- Lower bundle size and fewer runtime layers
- Clear control over storage persistence prompts
