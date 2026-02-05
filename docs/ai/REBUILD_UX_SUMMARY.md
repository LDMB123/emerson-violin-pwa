# Rebuild UX Summary (Token-Optimized)

- Source: `docs/rebuild/27-ui-ux-audit.md`
- Date: 2026-02-04
- Scope: command center shell, navigation, flows, tool UX, visual system

## Users + JTBD
- Student: fast feedback, clear steps, low friction
- Parent: visible progress, weekly summary
- Teacher: consistency, reflection, coaching cues
- JTBD: complete focused practice session with clear start/progress/finish

## Flow
- Entry → start session → follow steps → use tools → reflect → export/share
- Happy path: overview → flow steps → tuner/metronome → finish → reflection → export summary
- Edge cases: mic denied (recovery + demo mode), offline first load (cached shell + status)
- Errors: audio capture failure, storage quota warning

## IA
- Sections: Overview, Flow, Studio, Insights, Core, Support, Controls
- Navigation: anchored single-page layout, persistent nav

## Findings
- Critical: fragmented daily flow → fixed by single command center
- High: tools hidden → Studio section; sharing absent → weekly export
- Medium: session state invisible → progress ring + status chips
- Low: decorative graphics → functional status UI

## Interaction Specs
- Start: timer + status chip
- Pause: timer stop, button state toggle
- Finish: store summary + reset state
- Step toggle: daily persistence via local storage
- Export: weekly summary

## A11y
- Keyboard navigation, focus-visible, touch targets ≥ 44px

## Open Questions
- Weekly summary metrics?
- Reflection include audio notes?
- Teacher view separate role vs shared dashboard?

## Next Steps
- 5-user usability pass on flow checklist
- iOS recorder storage limits validation
- Expand insights with pitch/tempo accuracy
