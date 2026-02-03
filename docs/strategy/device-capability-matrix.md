# Device Capability Matrix

This matrix defines feature tiers and gating logic for iPad mini 6 (A15) and Safari 26.2.
The goal is to keep the app fast and stable while enabling advanced features only when safe.

## Tier Definitions

**Tier 3 (High)**
- Target: iPad mini 6 A15 in Home Screen mode.
- Signals: `hardwareConcurrency >= 4`, `deviceMemory >= 4`, `WebAssembly` ready, `AudioWorklet` ready.
- Enables: WASM audio pipeline, heavier background compute, extended lesson pack prefetch.

**Tier 2 (Balanced)**
- Target: modern iPads or iPhones with solid CPU but uncertain memory signals.
- Signals: `hardwareConcurrency >= 4` OR `deviceMemory >= 4`, `AudioWorklet` ready.
- Enables: WASM audio pipeline, constrained background compute, smaller prefetch batches.

**Tier 1 (Low)**
- Target: low memory or limited concurrency devices, or Save-Data enabled.
- Signals: `saveData === true` OR `hardwareConcurrency < 4` OR `deviceMemory < 4`.
- Enables: JS fallback paths, minimal prefetch, limited background compute.

## Feature Gating Map

- WASM audio engine: Tier 2+
- WASM recommendations seed: Tier 2+ and `saveData !== true`
- Background ML compute: Tier 2+ and `document.visibilityState === 'hidden'`
- Lesson pack prefetch batch size: Tier 3 full, Tier 2 half, Tier 1 minimal
- View transitions: Tier 2+ and `prefers-reduced-motion` off

## Notes
- Home Screen mode is recommended but not required for Tier 3.
- Capability checks should be re-evaluated on mode changes and on navigation.
- If any signal is missing, default to the safer tier.
