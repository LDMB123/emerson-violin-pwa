# Safari 26.2 / iPadOS 26.2 Testing Guide
**Emerson Violin PWA - iPad mini (6th Generation)**

## Device Specs
- **Device**: iPad mini (6th generation)
- **Chip**: Apple A15 Bionic
- **Screen**: 8.3" Liquid Retina (2266 x 1488 px at 326 ppi)
- **OS**: iPadOS 26.2
- **Browser**: Safari 26.2

## Pre-Test Setup

### 1. Deploy to Test Server
```bash
# Build production bundle
npm run build

# Preview locally or deploy to test server with HTTPS
npm run preview
# OR deploy to Vercel/Netlify for HTTPS testing
```

### 2. Access on iPad
- Open Safari on iPad mini
- Navigate to deployed URL (must be HTTPS for PWA features)
- Accept any microphone permission prompts

---

## Phase 2: Safari-Compatible API Testing

### Test 1: Web Crypto PBKDF2 (Parent PIN)

**What to test**: Secure PIN hashing with PBKDF2 (100,000 iterations)

**Steps**:
1. Navigate to **#view-parent** (parent section)
2. System prompts for PIN - try entering wrong PIN `9999`
3. **Expected**: Access denied, returns to home
4. Navigate to **#view-parent** again
5. Enter default PIN `1001`
6. **Expected**: Access granted to parent section
7. In parent section, find "Change Parent PIN" section
8. Enter new PIN: `5678`
9. Click "Save PIN" button
10. **Expected**: Status shows "PIN updated (secure)."
11. Refresh page, navigate to **#view-parent**
12. Enter old PIN `1001`
13. **Expected**: Access denied (old PIN no longer works)
14. Enter new PIN `5678`
15. **Expected**: Access granted with new PIN

**Browser Console Check**:
```javascript
// Open Safari DevTools (Settings > Safari > Advanced > Web Inspector)
// Connect iPad to Mac, use Safari > Develop > [iPad name]
// Check localStorage for secure PIN storage:
JSON.parse(localStorage.getItem('panda-violin:parent-pin-v2'))
// Expected: { hash: "...", salt: "...", createdAt: ..., updatedAt: ... }
// hash and salt should be hex strings (64 chars each)
```

**Success Criteria**:
- ✅ PIN verification works (correct PIN grants access)
- ✅ Wrong PIN denies access
- ✅ PIN change persists across page reload
- ✅ localStorage contains hash + salt (not plaintext PIN)
- ✅ No console errors related to Web Crypto

---

### Test 2: Badging API (Practice Reminders)

**What to test**: App badge updates based on practice completion

**Steps**:
1. **Setup**: Add app to Home Screen for badge testing
   - In Safari, tap Share button
   - Tap "Add to Home Screen"
   - Name: "Emerson Violin"
   - Tap "Add"
2. Close Safari, return to Home Screen
3. **Expected**: App icon appears with NO badge initially
4. Open Emerson Violin PWA from Home Screen
5. Navigate to practice section
6. Mark a practice task as incomplete (if not already)
7. Press Home button (or swipe up) to minimize app
8. **Expected**: App badge shows count of incomplete tasks (e.g., "3")
9. Reopen app from Home Screen
10. Complete a practice task
11. Minimize app again
12. **Expected**: Badge count decreases (e.g., "2")
13. Complete all practice tasks
14. Minimize app
15. **Expected**: Badge clears (no number shown)

**Browser Console Check**:
```javascript
// Check Badging API availability
'setAppBadge' in navigator && 'clearAppBadge' in navigator
// Expected: true (Safari 17+)

// Manually test badge
await navigator.setAppBadge(5)  // Badge shows "5"
await navigator.clearAppBadge()  // Badge clears
```

**Success Criteria**:
- ✅ Badging API available (`navigator.setAppBadge` exists)
- ✅ Badge updates when practice tasks completed
- ✅ Badge clears when all tasks done
- ✅ Badge visible when app minimized
- ✅ No console errors related to Badging

---

## Phase 3: iPad mini 6th Gen Optimizations

### Test 3: Visual Viewport API (Keyboard Handling)

**What to test**: Keyboard appearance doesn't obscure input fields

**Steps**:
1. Navigate to "Games" section
2. Tap any input field (e.g., note name input)
3. On-screen keyboard appears
4. **Expected**:
   - Input field scrolls into view above keyboard
   - Input remains visible while typing
   - No part of input obscured by keyboard
5. Type several characters
6. **Expected**: Text visible in input field
7. Dismiss keyboard (tap outside or "Done")
8. **Expected**: Layout returns to normal

**Browser Console Check**:
```javascript
// Check Visual Viewport API
window.visualViewport
// Expected: VisualViewport object with height, offsetTop properties

// Monitor keyboard appearance
window.visualViewport.addEventListener('resize', (e) => {
    console.log('Viewport height:', window.visualViewport.height);
    console.log('Viewport offset:', window.visualViewport.offsetTop);
});
// Type in input - should log height changes
```

**Success Criteria**:
- ✅ Input fields remain visible when keyboard appears
- ✅ Auto-scroll brings focused input into view
- ✅ No layout shift bugs when keyboard dismisses
- ✅ Visual Viewport API available

---

### Test 4: Touch Interactions

**What to test**: Touch targets sized appropriately for iPad (44px minimum)

**Steps**:
1. Navigate through all sections (Home, Practice, Games, Parent)
2. Try tapping all buttons, toggles, links
3. **Check**:
   - All interactive elements easily tappable
   - No accidental mis-taps due to small targets
   - Buttons don't feel cramped
4. Test toggles:
   - Tap metronome toggle (Settings)
   - Tap recording toggle (Settings)
   - **Expected**: Toggles respond to first tap, no need to retry
5. Test sliders:
   - Adjust volume slider
   - **Expected**: Smooth dragging, no jumping
6. Test tuner strings:
   - Tap each string button (G, D, A, E)
   - **Expected**: Immediate response, clear visual feedback

**Success Criteria**:
- ✅ All touch targets ≥44px (Apple HIG minimum)
- ✅ No mis-taps or "dead zones"
- ✅ Touch feedback immediate (no delay)
- ✅ Comfortable one-handed use on iPad mini

---

### Test 5: Screen Wake Lock

**What to test**: Screen stays on during practice sessions

**Steps**:
1. Navigate to song practice view (e.g., "Twinkle Twinkle")
2. Toggle play/practice mode ON
3. Let iPad sit idle for 2-3 minutes
4. **Expected**:
   - Screen remains on (doesn't auto-lock)
   - Song playback continues
   - No interruption to practice
5. Toggle play/practice mode OFF
6. Let iPad sit idle for 30 seconds
7. **Expected**: Screen auto-lock resumes (screen dims/locks normally)

**Browser Console Check**:
```javascript
// Check Wake Lock API
'wakeLock' in navigator
// Expected: true

// Request wake lock manually
const wakeLock = await navigator.wakeLock.request('screen');
console.log('Wake lock active:', !wakeLock.released);
// Expected: true

// Release wake lock
await wakeLock.release();
console.log('Wake lock released:', wakeLock.released);
// Expected: true
```

**Success Criteria**:
- ✅ Wake Lock API available
- ✅ Screen stays on during practice
- ✅ Wake lock releases when practice stopped
- ✅ Auto-lock resumes after practice

---

## Phase 4: Performance & Audio Testing

### Test 6: AudioWorklet Performance

**What to test**: Real-time pitch detection (<50ms latency) on iPad A15

**Steps**:
1. Navigate to Tuner view (home screen)
2. Grant microphone permission if prompted
3. Play a violin note (or hum a pitch near mic)
4. **Check**:
   - Pitch detection starts within 50ms
   - Note name displays correctly (e.g., "A4" for 440 Hz)
   - Cents indicator shows tuning accuracy
   - Visual feedback smooth (no lag or stutter)
5. Play different pitches rapidly (glissando)
6. **Expected**: Pitch updates track note changes smoothly
7. Check browser console for performance warnings
8. **Expected**: No "AudioWorklet underrun" or latency warnings

**Performance Metrics**:
```javascript
// Check AudioContext state
const audioContext = new AudioContext();
console.log('Sample rate:', audioContext.sampleRate); // Expected: 48000 Hz
console.log('Base latency:', audioContext.baseLatency); // Expected: <0.01 (10ms)
```

**Success Criteria**:
- ✅ Pitch detection latency <50ms (imperceptible)
- ✅ Accurate note detection (±1 cent)
- ✅ No audio glitches or dropouts
- ✅ Smooth visual updates (60fps)
- ✅ CPU usage reasonable (check with Xcode Instruments if needed)

---

### Test 7: IndexedDB Storage Persistence

**What to test**: Recordings and progress persist across sessions

**Steps**:
1. Navigate to Practice section
2. Record a short clip (5-10 seconds)
3. Complete a practice task
4. **Force quit app**:
   - Swipe up from bottom, pause in middle of screen
   - Swipe app preview up to close
5. Reopen app from Home Screen
6. Navigate to Recordings section
7. **Expected**: Recording from step 2 still present
8. Navigate to Practice section
9. **Expected**: Practice progress retained (completed task still marked done)
10. **Airplane mode test**:
    - Enable Airplane Mode
    - Close and reopen app
    - Navigate to all sections
    - **Expected**: All data still accessible offline

**Browser Console Check**:
```javascript
// Check storage persistence
if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log('Storage persisted:', isPersisted);
    // Expected: true
}

// Check storage usage
const estimate = await navigator.storage.estimate();
console.log('Usage:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
console.log('Quota:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
// Expected: Reasonable usage, quota >100MB on iPad
```

**Success Criteria**:
- ✅ Storage.persist() returns true
- ✅ Recordings survive app restart
- ✅ Practice progress survives app restart
- ✅ Works offline (Airplane Mode)
- ✅ No "QuotaExceededError" warnings

---

## Phase 5: PWA Installation & Offline

### Test 8: PWA Installation

**What to test**: Add to Home Screen experience on iPad

**Steps**:
1. In Safari, navigate to app URL
2. Tap Share button (square with arrow up)
3. Scroll and tap "Add to Home Screen"
4. **Check**:
   - App name appears correctly: "Emerson Violin"
   - App icon displays (should be violin icon, not Safari generic)
   - Option to edit name/icon before adding
5. Tap "Add" button
6. Return to Home Screen
7. **Check**:
   - App icon appears alongside other apps
   - Icon shows correct branding
   - Tap icon to launch
8. **Check launch experience**:
   - App opens in standalone mode (no Safari UI)
   - No address bar or browser chrome
   - Status bar shows app in full-screen
   - Splash screen appears briefly (if configured)

**Web App Manifest Check** (before adding):
```javascript
// In Safari console
fetch('/manifest.json')
    .then(r => r.json())
    .then(manifest => {
        console.log('App name:', manifest.name);
        console.log('Short name:', manifest.short_name);
        console.log('Display mode:', manifest.display);
        console.log('Icons:', manifest.icons.length);
    });
// Expected: name, icons array, display: "standalone"
```

**Success Criteria**:
- ✅ "Add to Home Screen" option available
- ✅ Correct app name and icon show in dialog
- ✅ Icon appears on Home Screen after adding
- ✅ Launches in standalone mode (no browser UI)
- ✅ Splash screen appears (if configured)

---

### Test 9: Offline Functionality

**What to test**: App works without internet connection

**Steps**:
1. With app already installed (from Test 8)
2. **Enable Airplane Mode** (swipe down from top-right, tap airplane icon)
3. Close Emerson Violin app completely
4. Reopen app from Home Screen
5. **Expected**: App loads successfully offline
6. Navigate through all sections:
   - Home (Tuner)
   - Practice
   - Games
   - Recordings
   - Parent
7. **Check**:
   - All UI elements load
   - Tuner functionality works (microphone access)
   - Practice tasks display
   - Recordings play back
   - Games function
8. Try recording a new clip offline
9. **Expected**: Recording saves locally
10. Try creating new practice progress
11. **Expected**: Progress saves locally
12. **Disable Airplane Mode**
13. **Expected**: App continues working, no errors

**Service Worker Check**:
```javascript
// Check Service Worker registration
navigator.serviceWorker.getRegistrations()
    .then(regs => {
        console.log('Service Workers:', regs.length);
        regs.forEach(reg => {
            console.log('  Scope:', reg.scope);
            console.log('  Active:', !!reg.active);
        });
    });
// Expected: At least 1 registration, active: true

// Check cache storage
caches.keys()
    .then(keys => {
        console.log('Cache names:', keys);
        keys.forEach(key => {
            caches.open(key).then(cache => {
                cache.keys().then(reqs => {
                    console.log(`  ${key}: ${reqs.length} entries`);
                });
            });
        });
    });
// Expected: Multiple caches (static, dynamic), many entries
```

**Success Criteria**:
- ✅ App loads offline (no "No Internet" error)
- ✅ All core features work offline (tuner, recordings, practice)
- ✅ Service Worker active and caching
- ✅ Smooth transition when connection restored
- ✅ No degraded experience offline

---

## Phase 6 & 7: Documentation & Build Validation

### Post-Testing Actions

After completing all iPad tests:

1. **Document findings** in issue tracker or notes
2. **Take screenshots** of any issues found
3. **Note performance metrics** from Safari Web Inspector
4. **Run lint and build** on development machine:
   ```bash
   npm run lint
   npm run build
   ```

---

## Known Safari/iOS Limitations

These are expected behaviors (not bugs):

1. **No Background Sync**: Uploads only retry when app reopened
2. **No Web Codecs compression**: MediaRecorder uses WebM/Opus instead
3. **No Storage Buckets**: Single storage quota for all data
4. **Push notifications**: Require explicit user permission, no silent push
5. **Fullscreen API**: Not available in iOS Safari
6. **Web Bluetooth/USB**: Not supported

---

## Success Criteria Summary

**Must Pass**:
- ✅ All 9 manual tests above
- ✅ No console errors for Safari-compatible APIs
- ✅ Smooth performance on iPad mini A15
- ✅ Offline functionality works completely
- ✅ PWA installation and standalone mode work

**Nice to Have**:
- Performance metrics logged for future optimization
- Screenshots of successful tests for documentation
- User feedback on touch interaction comfort

---

## Troubleshooting

### Microphone Not Working
- Check Settings > Safari > Microphone > Allow
- Reload page and grant permission again

### Badge Not Appearing
- Ensure app added to Home Screen (badges only work for installed PWAs)
- Check Settings > Notifications > Emerson Violin > Badges enabled

### Service Worker Not Caching
- Clear Safari cache: Settings > Safari > Clear History and Website Data
- Reinstall app from Home Screen
- Check Service Worker in Web Inspector

### Visual Viewport Issues
- Ensure iOS keyboard settings configured properly
- Try different input types (text, number, search)

---

**Testing Duration**: Approximately 45-60 minutes for complete test suite
**Prerequisites**: iPad mini (6th gen) with iPadOS 26.2, Safari 26.2, deployed HTTPS app
