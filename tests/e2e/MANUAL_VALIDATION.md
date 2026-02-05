# Manual Validation Checklist - iPad mini 6

## Prerequisites
- [ ] Device: iPad mini 6 (A15 chip)
- [ ] OS: iPadOS 26.2 or later
- [ ] Browser: Safari 26.2 or later
- [ ] Network: WiFi connection available for online tests

## Home Screen Install
- [ ] Navigate to app URL in Safari
- [ ] Tap Share button
- [ ] Select "Add to Home Screen"
- [ ] Verify app icon appears on home screen
- [ ] Launch app from home screen
- [ ] Verify app opens in standalone mode (no Safari UI)

## Offline Cold Start
- [ ] Enable Airplane Mode
- [ ] Launch app from Home Screen
- [ ] Verify app loads with cached shell
- [ ] Verify core UI renders (sections visible)
- [ ] Verify offline indicator shows "Offline"
- [ ] Disable Airplane Mode

## Storage Pressure
- [ ] Navigate to Support section → Device diagnostics
- [ ] Expand "Storage pressure drill" details
- [ ] Tap "Fill OPFS" to create 64MB test blobs
- [ ] Verify storage usage climbs (check storage meter in header)
- [ ] Verify pressure status updates
- [ ] Check that auto-cleanup triggers at high usage
- [ ] Tap "Clear drill blobs"
- [ ] Verify storage usage drops back down

## DB Integrity Drill
- [ ] Navigate to Support section → Device diagnostics
- [ ] Tap "Run integrity drill" button
- [ ] Wait for drill to complete
- [ ] Verify status shows "pass" or specific error message
- [ ] Check drill status element updates

## PDF Pack Offline
- [ ] While online, navigate to Core section → Service worker
- [ ] Tap "Cache PDF offline pack"
- [ ] Wait for pack to cache
- [ ] Verify pack status shows "Cached"
- [ ] Go offline (Airplane Mode)
- [ ] Navigate to ML Lab section → Score following
- [ ] Load a PDF score
- [ ] Verify PDF renders correctly offline

## Push Reminders
- [ ] Navigate to Controls section → Reminders
- [ ] Tap "Enable reminders" button
- [ ] Verify notification permission prompt appears
- [ ] Grant notification permission
- [ ] Set reminder time (e.g., 1 minute from now)
- [ ] Wait for scheduled time
- [ ] Verify notification fires on device

## Migration Flow (legacy install)
- [ ] If legacy IDB data exists from prior version
- [ ] Verify migration CTA banner appears at top of app
- [ ] Read banner copy explaining upgrade
- [ ] Tap "Migrate now" button
- [ ] Wait for migration to complete
- [ ] Verify migration status updates to "Complete"
- [ ] Verify data accessible in SQLite mode
- [ ] Verify banner dismisses after successful migration
