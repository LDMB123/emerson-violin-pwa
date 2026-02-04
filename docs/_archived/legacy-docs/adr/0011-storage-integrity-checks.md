# ADR-0011: Storage Integrity Checks for IndexedDB Values

- Status: accepted
- Date: 2026-02-03

## Context
- IndexedDB writes can be interrupted or return stale/corrupt values.
- Silent corruption breaks offline behavior and is hard to detect.

## Decision
- Store a checksum per JSON value using a `__integrity__:` key prefix.
- On read, verify the checksum and quarantine mismatches by deleting both keys.
- Emit a `panda:storage-integrity` event for UI diagnostics.

## Consequences
- Adds a small write/read overhead per JSON value.
- Improves offline reliability and self-healing behavior.
- Requires reserved key prefix handling in storage helpers.
