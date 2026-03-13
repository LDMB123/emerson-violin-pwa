# Red Panda Asset Workspace

## Description

This folder is the generation workspace for red panda coaching art and prompt matrix outputs.

## Installation

No code install is required for the workspace metadata. Ensure the parent repo is set up before generating assets:

- Install repo dependencies: `npm install`
- Verify runtime: `npm run runtime:check`

## Usage

- Keep source rules in `prompts/`:
  - `prompts/base-template.txt`
  - `prompts/state-matrix.csv`
- Output generated assets into the expected shape:
  - `Format`: `webp`
  - `Size`: `1024x1024`
  - `Background`: isolated/transparent
  - `Naming`: `panda_state-<state>_variant-<x>_v<y>.webp`
- Use `tier1` outputs for highest-frequency real-time overlays and `tier2` for expanded coverage.

## Source Mapping

This workspace does not own JavaScript build maps; source mapping notes for runtime debugging are documented in [README.md](../README.md) and [CLAUDE.md](../CLAUDE.md).

## License

No workspace-specific license is present. Follow the root repository licensing policy before redistribution.
