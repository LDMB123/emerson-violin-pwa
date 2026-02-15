# Motion Spec

Last updated: 2026-02-15

## Purpose
- Reinforce progression through the session flow.
- Provide subtle feedback on section entry without distraction.

## Animations
- Section reveal: `.reveal` uses `rise` animation (fade + 18px lift).
- CTA hover: slight translateY(-1px) for tactile affordance.

## Timing
- Default durations: 180ms, 300ms, 450ms.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for a springy ease-out.

## Reduced Motion
- Respect `prefers-reduced-motion` and `reduceMotion` preference.
- Disable reveal animations entirely when enabled.
