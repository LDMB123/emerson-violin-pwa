# Safari / iPadOS Testing Guide
**Installed app metadata: Emerson's Violin Studio / ViolinPanda**

Target manual validation on a real iPad mini (6th generation) running the current target iPadOS and Safari builds.

## Before You Start

### Deploy and connect
```bash
npm run build
npm run preview
```

- Serve over HTTPS for install, badge, and other PWA checks.
- Open the deployed URL in Safari on the iPad.
- Do not grant microphone access until you reach a flow that actually needs it.
- If needed, connect Web Inspector from macOS Safari: `Develop > [iPad] > [page]`.

### Baseline sanity

Confirm before running deeper tests:
- App opens to onboarding or Home without console errors.
- Onboarding can be completed on a fresh launch.
- Tuner is reachable from Home.
- Song play route opens without a microphone prompt.
- Song record route prompts for the microphone before entering the runner.
- Service worker is active.

Console spot check:
```javascript
const regs = await navigator.serviceWorker.getRegistrations();
console.log(regs[0]?.active?.state);
// Expected: "activated"
```

## Test Matrix

### 1. Parent PIN / Web Crypto PBKDF2

Goal: verify secure PIN hashing and persistence.

Steps:
1. Open Parent Zone at `/parent`.
2. Enter wrong PIN `9999` and confirm access is denied.
3. Enter default PIN `1001` and confirm access is granted.
4. In **Parent PIN**, set PIN to `5678` and save.
5. Refresh, retry `1001`, then retry `5678`.

Console check:
```javascript
JSON.parse(localStorage.getItem('panda-violin:parent-pin-v2'))
```

Pass if:
- wrong PIN fails
- new PIN survives reload
- stored value contains hash + salt, not plaintext PIN
- no Web Crypto errors appear

### 2. App Badging

Goal: verify practice reminders update the installed app badge.

Steps:
1. Add the app to Home Screen from Safari.
2. Confirm install title matches current manifest metadata unless edited manually.
3. Launch the installed app.
4. Leave at least one practice item incomplete in **Practice Coach**.
5. Minimize the app and confirm a badge appears.
6. Complete tasks and confirm the badge count drops, then clears when everything is complete.

Console check:
```javascript
'setAppBadge' in navigator && 'clearAppBadge' in navigator
```

Pass if:
- badge API is present on the target Safari build
- badge changes while the app is installed and backgrounded
- badge clears when no reminder remains

### 3. Visual Viewport / Keyboard Handling

Goal: verify the keyboard does not cover inputs.

Steps:
1. Open a view with text input.
2. Focus the input and show the software keyboard.
3. Type several characters.
4. Dismiss the keyboard.

Console check:
```javascript
window.visualViewport
```

Pass if:
- focused input stays visible above the keyboard
- layout returns to normal after dismissal
- no viewport-related layout bugs appear

### 4. Touch Targets and Gestures

Goal: verify touch sizing and responsiveness on iPad mini.

Steps:
1. Navigate through Home, Practice Coach, Games, Songs, Tuner, and Parent Zone.
2. Tap primary buttons, toggles, links, sliders, and tuner string selectors.
3. Check for first-tap response and obvious dead zones.

Pass if:
- interactive targets are comfortably tappable
- toggles respond on first tap
- sliders drag smoothly
- tuner string buttons respond immediately

### 5. Screen Wake Lock

Goal: verify the screen stays awake during active practice.

Steps:
1. Start a song or practice flow that should hold wake lock.
2. Leave the iPad idle for several minutes.
3. Stop the practice flow and wait again.

Console check:
```javascript
'wakeLock' in navigator
```

Pass if:
- screen stays awake during active practice
- wake lock releases when practice stops
- normal auto-lock resumes afterward

### 6. AudioWorklet / Tuner Performance

Goal: verify real-time pitch detection feels immediate and stable.

Steps:
1. Open Tuner at `/tools/tuner`.
2. Grant microphone access.
3. Play sustained notes, then rapid pitch changes.
4. Watch note name, cents feedback, and UI smoothness.

Console check:
```javascript
const audioContext = new AudioContext();
console.log(audioContext.sampleRate, audioContext.baseLatency);
```

Pass if:
- pitch updates feel effectively real time
- note detection is accurate and stable
- no audible glitches or worklet warnings appear
- visual feedback stays smooth

### 6a. Song Play vs Record Gate

Goal: verify normal song playback is not blocked by microphone permission, while recording still is.

Steps:
1. Open a song detail page.
2. Enter the normal play route.
3. Confirm the runner loads immediately without a permission gate.
4. Return to the detail page and enter the record route.
5. Confirm the microphone permission explainer appears before the runner.
6. Grant permission and confirm the record flow starts normally.

Pass if:
- normal play does not request microphone access
- record intent does request microphone access
- granting permission enters the recording flow cleanly

### 6b. Tool Audio Lifecycle

Goal: verify standalone Web Audio tools recover cleanly across backgrounding.

Steps:
1. Open Metronome and start playback.
2. Background the installed app, then foreground it.
3. Confirm the tool is still responsive and can be started again.
4. Open Tone Lab / Drone and start a reference tone.
5. Background and foreground the app again.
6. Confirm the old tone does not continue as a zombie tone and a new tone can be started.

Pass if:
- metronome stops or pauses cleanly while hidden
- metronome can be restarted after foregrounding
- drone tone does not remain stuck after backgrounding
- no audio errors or frozen controls appear

### 7. IndexedDB Persistence

Goal: verify recordings and practice progress survive restarts and offline use.

Steps:
1. Enable **Practice recordings** in **Parent Zone**.
2. Record a short clip from a song.
3. Complete at least one practice step.
4. Force-quit the app and reopen it.
5. Confirm the recording and progress remain.
6. Repeat a reopen check in Airplane Mode.

Console check:
```javascript
const estimate = await navigator.storage.estimate();
console.log(estimate.usage, estimate.quota);
```

Pass if:
- recordings survive app restarts
- progress survives app restarts
- offline reopen still exposes saved data
- no quota or storage errors appear

Additional recording playback check:
1. Open the recorded song’s detail page.
2. Play back the saved recording from the recording list.

Pass if:
- blob-backed recordings play back successfully from song detail
- stopping and replaying works without reload

### 8. PWA Install Flow

Goal: verify Home Screen install and standalone launch.

Steps:
1. In Safari, use **Share > Add to Home Screen**.
2. Confirm app title and icon are correct.
3. Add the app and launch it from Home Screen.

Console check:
```javascript
const manifestUrl = document.querySelector('link[rel="manifest"]')?.href;
fetch(manifestUrl).then((r) => r.json())
```

Pass if:
- Add to Home Screen is available
- title/icon are correct
- app launches in standalone mode without Safari chrome

### 9. Offline Functionality

Goal: verify core flows work without network access.

Steps:
1. Install the app first.
2. Enable Airplane Mode.
3. Close and reopen the installed app.
4. Visit Home, Practice Coach, Games, Songs, Tuner, Parent Zone, and Backup.
5. Create new local progress and a new local recording offline.
6. Disable Airplane Mode and confirm the app continues cleanly.

Console checks:
```javascript
await navigator.serviceWorker.getRegistrations();
await caches.keys();
```

Pass if:
- app launches offline
- core flows still work offline
- service worker remains active
- reconnect does not break the session

## After Testing

### Record results
- file bugs or notes for any regressions
- capture screenshots only for failures or notable UI regressions
- record Safari Web Inspector metrics if performance changed

### Run local verification after fixes
```bash
npm run lint:all
npm run build
npm run test
npm run handoff:verify
```

## Known Safari / iPadOS Limitations

Expected platform constraints:
- no Background Sync; retries happen when the app reopens
- no Storage Buckets; quota is shared
- no Fullscreen API in iOS Safari
- no Web Bluetooth or Web USB
- push notifications require explicit permission and are not silent
- UA-derived OS version can be stale; do not use it for user-facing version display
- handle `AudioContext` `'interrupted'` alongside `'suspended'`
- prefer `screen.orientation` change events and keep `orientationchange` as fallback

## Troubleshooting

### Microphone fails
- check `Settings > Safari > Microphone`
- reload and re-grant permission

### Badge does not appear
- confirm the app was launched from Home Screen, not Safari
- check iPad notification settings for badge permission

### Service worker does not cache
- clear Safari website data
- reinstall the Home Screen app
- recheck registration in Web Inspector

### Keyboard obscures inputs
- retest with software keyboard visible
- compare multiple input types before filing a layout bug

## Exit Criteria

Must pass:
- PIN, storage, offline, install, and core Safari compatibility checks
- no blocking console errors
- no significant touch, keyboard, or audio regressions

Nice to capture:
- screenshots for regressions
- performance notes for future comparison
