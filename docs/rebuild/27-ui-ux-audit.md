# UI/UX Audit

Last updated: 2026-02-15

Scope: Command center shell, navigation, flows, tool UX, and visual system.

## Design Summary
The legacy UI was feature-rich but fragmented, forcing users to context-switch between tools and practice flow. The rebuild consolidates the daily ritual into a command center that makes the next action obvious, keeps tools one scroll away, and turns progress into a persistent system of record.

## User Context
Primary users
- Student: wants fast feedback, clear steps, and minimal friction.
- Parent: wants visible progress and weekly summaries.
- Teacher: wants consistency, reflection, and coaching cues.

Primary job-to-be-done
- Complete one focused practice session with clear start, progress, and finish.

## User Flow
Step-by-step journey
1. Entry → 2. Start session → 3. Follow steps → 4. Use tools → 5. Reflect → 6. Export/share

### Happy Path
- Open Overview → Start session → Check off flow steps → Use tuner/metronome → Finish session → Add reflection → Export weekly summary.

### Edge Cases
- No mic permission: show recovery guide and keep tools in demo mode.
- Offline first load: cached shell loads and status chips show offline state.

### Error States
- Audio capture failure: show retry + device tips.
- Storage quota warning: surface storage meter + clear recordings.

## Journey Map (with friction points)
Discover
- Needed: primary CTA visible without scroll.
- Previous friction: starting practice was buried in multi-view navigation.

Engage
- Needed: flow steps visible during the session.
- Previous friction: steps were implicit and spread across screens.

Reflect
- Needed: short, persistent reflection field.
- Previous friction: notes were hidden behind deep navigation.

Share
- Needed: one-click weekly PDF export.
- Previous friction: data export required multi-step JSON workflow.

## Heuristic Review (Nielsen)
Visibility of system status
- ✅ Session timer + progress ring visible.
- ✅ Offline/Install status chips visible.

Match between system and real world
- ✅ “Flow steps” mirrors a practice routine.

User control and freedom
- ✅ Pause/finish/reset controls are persistent.

Consistency and standards
- ✅ Unified card + button hierarchy.

Error prevention
- ✅ Microphone recovery guide and onboarding check.

Recognition over recall
- ✅ Daily steps + last session summary in overview.

Flexibility and efficiency
- ✅ Anchor navigation + quick actions.

## Information Architecture
Top-level sections
- Overview: start session + summary
- Flow: step checklist + reflection
- Studio: tuner, metronome, recorder
- Insights: sliders + recommendations
- Core: goals, notes, recordings
- Support: install, offline, mic recovery
- Controls: preferences, exports, system

Navigation logic
- Single anchored layout keeps context intact.
- Navigation remains visible for quick jumps.

## Audit Findings (Severity)
Critical
- Fragmented daily flow → solved by single command center.

High
- Tools hidden behind separate views → solved by Studio section.
- Parent/teacher sharing absent → solved by weekly PDF export.

Medium
- Session state not visible → solved by progress ring + status chips.

Low
- Overuse of decorative graphics → replaced with functional status UI.

## Wireframes (Low-fi)
```
[Topbar: Brand | Offline | Install | Session]
[Nav: Overview | Flow | Studio | Insights | Core | Support | Controls]

[Overview]
- Session card (Start/Pause/Finish)
- Progress ring + summary metrics

[Flow]
- Checklist (4-6 steps)
- Reflection field

[Studio]
- Tuner panel
- Metronome panel
- Recorder panel

[Insights]
- Sliders + recommendation cards

[Controls]
- Preferences toggles
- Export buttons
```

## Interaction Specifications
- Start Session: starts timer + updates status chip.
- Pause: pauses timer; button state toggles.
- Finish: stores session summary + resets active state.
- Step toggle: persists per day in local storage.
- Export PDF: builds weekly summary from local history.

## Accessibility Considerations
- Keyboard navigation on toggles and controls.
- Focus-visible outlines on all interactive elements.
- Large touch targets (min 44px).

## Design Decisions & Rationale
- Anchored single-page layout: reduces context switching.
- Visible progress ring: motivates completion.
- Status chips: provide instant system feedback.
- Lightweight JS only: faster iteration and offline reliability.

## Open Questions
- Which metrics should appear in the weekly PDF summary?
- Should reflection include audio notes?
- Teacher view: separate role or shared dashboard?

## Next Steps
- Conduct 5-user usability pass on the flow checklist.
- Validate recorder storage limits on iOS Safari.
- Expand insights to include real pitch/tempo accuracy.
