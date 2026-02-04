# ADR-0010: Storage Write Queue for IndexedDB Failures

- Status: accepted
- Date: 2026-02-03

## Context
- IndexedDB can be temporarily unavailable (blocked, quota pressure, or slow open).
- Writes from critical UX flows should not silently fail.

## Decision
- Add a small in-memory write queue for JSON set/remove operations.
- Coalesce writes by key and retry with exponential backoff.
- Flush on `online` and `visibilitychange`.

## Consequences
- Improves reliability of local data writes without blocking UX.
- Small memory overhead; queued writes are capped.
- Blob writes remain synchronous to avoid large memory usage.
