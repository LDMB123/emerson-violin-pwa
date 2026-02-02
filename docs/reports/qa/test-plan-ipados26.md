## Test Plan

### Feature: Emerson-Violin PWA (Local-Only, Offline-First)
**Version**: 2.0.0
**Environment**: iPadOS 26.2 Safari + Home Screen PWA
**Tester**: QA
**Date**: 2026-01-27

---

### Scope
**In Scope**:
- Installability (Add to Home Screen, standalone display)
- Offline-first flows (home, songs, games, coach, tuner, parent zone)
- IndexedDB persistence and state restore
- Service worker update + cache integrity
- Practice tracking + achievements (checklists)
- Audio reference tones and tuner mic permission
- UI/UX consistency with mockups (spacing, typography, tap targets)

**Out of Scope**:
- Server-side sync (local-only app)
- External analytics

### Test Approach
- **Test types**: Functional, regression, exploratory, usability
- **Devices/Browsers**: iPadOS 26.2 Safari (Home Screen PWA and in-browser)
- **Test data**: Fresh install, then persist state across reload + offline mode

---

## Test Cases

### TC-001: Add to Home Screen + Standalone Launch
**Priority**: High
**Type**: Functional

**Preconditions**:
- Safari on iPadOS 26.2

**Steps**:
1. Open app URL in Safari.
2. Use Share → Add to Home Screen.
3. Launch from Home Screen.

**Expected Result**:
- App opens in standalone mode.
- Status bar is translucent.
- Install status card indicates “Installed on Home Screen.”

---

### TC-002: Offline Launch + Navigation
**Priority**: High
**Type**: Functional

**Preconditions**:
- App installed; service worker active

**Steps**:
1. Enable Airplane Mode.
2. Launch app from Home Screen.
3. Navigate Home → Songs → Games → Coach → Tuner → Parent Zone.

**Expected Result**:
- App loads without network.
- Views render correctly; no broken assets.

---

### TC-003: IndexedDB Persistence
**Priority**: High
**Type**: Functional

**Preconditions**:
- App installed; offline OK

**Steps**:
1. Check several checklist items (goals + games).
2. Close app.
3. Relaunch app (still offline).

**Expected Result**:
- Checked items persist.
- Progress UI reflects stored state.

---

### TC-004: Practice Tracking + Achievements
**Priority**: High
**Type**: Functional

**Preconditions**:
- Fresh session

**Steps**:
1. Check items in Pitch Quest, Rhythm Dash, Bow Hero, Ear Trainer.
2. Check items in remaining games to cover all 9.
3. Open Progress view.

**Expected Result**:
- Practice minutes increase.
- Skill radar updates.
- All-games achievement unlocks when all 9 games are logged.

---

### TC-005: Audio Reference Tones
**Priority**: Medium
**Type**: Functional

**Preconditions**:
- Online or offline

**Steps**:
1. Open Pitch Quest and Ear Trainer.
2. Play reference tones.

**Expected Result**:
- Audio plays in offline mode.
- Media Session metadata updates.

---

### TC-006: Tuner Microphone Permissions
**Priority**: High
**Type**: Functional

**Preconditions**:
- iPadOS mic permissions enabled

**Steps**:
1. Open Tuner.
2. Tap Start.
3. Deny permission once, then allow.

**Expected Result**:
- Deny → user sees clear status.
- Allow → tuner starts and updates pitch UI.

---

### TC-007: Service Worker Update
**Priority**: Medium
**Type**: Regression

**Steps**:
1. Load app once (SW installs).
2. Update version and reload.

**Expected Result**:
- Old cache cleared.
- New cache active without broken assets.

---

### TC-008: UI Tap Targets + Typography
**Priority**: Medium
**Type**: Usability

**Steps**:
1. Interact with checklist labels, nav items, card buttons.
2. Verify touch targets on iPad.

**Expected Result**:
- Targets are comfortable; no cramped text.

---

## Test Matrix (Recommended)
- iPadOS 26.2 Safari (PWA): TC-001 → TC-008
- iPadOS 26.2 Safari (in-browser): TC-002, TC-003, TC-005
