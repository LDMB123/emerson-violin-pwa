# Archived Plans

## Description

This directory is a historical marker, not a live documentation source. It preserves the rationale for archive strategy and the boundary between current and historical planning artifacts.

## Installation

No install is required. This folder is read-only historical context in the active repo.

## Usage

- Use this README first when deciding whether a planning artifact should remain under `_archived/`.
- Check linked live docs before reactivating any plan-like content:
  - [README.md](../../README.md)
  - [CLAUDE.md](../../CLAUDE.md)
  - [docs/HANDOFF.md](../../docs/HANDOFF.md)
- Do not add active implementation plans here; keep it as reference-only material.

## Why The Old Files Were Removed

- The previous archive contained dozens of point-in-time planning and execution notes from February 2026.
- Most of those notes referenced file paths, module counts, and verification snapshots that no longer match the current repo.
- Keeping them in the working tree created documentation drift without adding operational value.

## Where To Look Instead

- Current developer entry points:
  - `README.md`
  - `CLAUDE.md`
  - `docs/HANDOFF.md`
- Historical detail:
  - commit history around the February 2026 cleanup and QA passes
  - current source and test diffs for the implemented behavior

## Scope Of The Archive

- `_archived/plans/` stays intentionally minimal.
- Historical planning scratchpads and per-pass status logs are intentionally pruned from the active tree.
- Archived source assets remain under other `_archived/` subdirectories when they are still useful for rollback or regeneration workflows.

## Current State

- The repo does not keep live implementation plan files in the active working tree.
- Claude scratch plans were moved out of `~/.claude/plans/` to archive storage.
- If a future task needs a plan, treat it as temporary working material and archive or delete it once the work is complete.

## License

No plan-file license is expected here; apply the repository-wide license policy for external sharing.
