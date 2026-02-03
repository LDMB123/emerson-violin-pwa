# ADR-0004: Navigation API with Hash Fallback

- Status: accepted
- Date: 2026-02-03

## Context
- Need native-feel navigation without heavy router
- Support Safari 26.2 and Home Screen mode
- Existing views are hash-based sections

## Decision
- Use Navigation API when available
- Keep hash routing fallback
- Dispatch view-change events for feature lazy-loading

## Consequences
- Minimal JS router overhead
- Compatible with Safari and non-supporting browsers
- Requires consistent view ID conventions
