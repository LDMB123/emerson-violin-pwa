# Styles Summary (Token-Optimized)

- Files: `src/styles/app.css`, `src/styles/tokens.css`
- Tokens: `src/styles/tokens.css` defines font faces, color system, spacing, radii, shadows, motion durations, dark scheme overrides
- Base: `:root` in `app.css` sets shell palette, sizing, transition, max width, grid gap
- Layout: `.app-shell`, `.topbar`, `.primary-nav`, `.content`, `.section`, `.section-header`, `.section-actions`
- Cards: `.card`, `.card-header`, `.badge`, `.chip`
- Buttons: `.button` + variants `.primary`, `.secondary`, `.ghost`
- Grids: `.overview-grid`, `.flow-grid`, `.studio-grid`, `.insights-grid`, `.core-grid`, `.support-grid`, `.controls-grid`
- Session: `.session-body`, `.session-timer`, `.progress-ring`, `.summary-grid`, `.status-line`
- Flow + reflection: `.flow-list`, `.flow-progress`, `.reflection`
- Tools: `.tool-card`, `.toggle`, `.slider-row`, `.tuner-display`, `.tool-status`
- Recorder + resources: `.recordings`, `.recording-item`, `.resource-list`, `.resource-info`
- Dialog + popovers: `.dialog`, `.dialog-header`, `.dialog-list`, `.popover-menu`
- Preferences: `html[data-large-text|data-high-contrast|data-calm-bg|data-compact-mode|data-dyslexia-mode]` adjust layout + palette
- Feature gating: `html[data-feature-games|data-feature-ml|data-feature-teacher="false"]` hides sections + nav links
- Games UI: `.game-grid`, `.game-stage`, `.game-hud`, `.hud-block`, `.game-canvas`, `.coach-card`
- Teacher UI: `.teacher-grid`, `.profile-list`, `.profile-card`, `.reminder-grid`, `.backup-grid`, `.doc-panel`
- Responsive: media query at `max-width: 900px`
