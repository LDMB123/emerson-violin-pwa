# Xcode Simulator Testing - iPad mini (6th Gen) Safari 26.2

Quick validation using Xcode Simulator before physical device testing.

## Setup Simulator

```bash
# List available iPad mini simulators
xcrun simctl list devices | grep "iPad mini"

# Boot iPad mini (6th generation) - iPadOS 18.2 (closest to 26.2)
# Find device UDID from list above, then:
xcrun simctl boot <DEVICE_UDID>

# Or use Xcode: Window > Devices and Simulators > + > iPad mini (6th generation)
```

## Start Development Server

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa

# Install dependencies if needed
npm install

# Start dev server with HTTPS (required for microphone access)
npm run dev -- --host
```

Note development server URL (e.g., `http://localhost:5173`)

## Open in Simulator Safari

```bash
# Open Safari in running simulator
xcrun simctl openurl booted "http://localhost:5173"

# Or: In Simulator, open Safari app and navigate manually
```

## Simulator Testing Limitations

**What works in Simulator**:
- ✅ Web Crypto API (PBKDF2) - Full support
- ✅ IndexedDB - Full support
- ✅ Service Workers - Full support
- ✅ Visual Viewport API - Full support
- ✅ Touch simulation - Click events work
- ✅ Screen wake lock API - Available (but won't prevent Mac sleep)
- ✅ Badging API - API available (but won't show on Mac Dock)

**What doesn't work in Simulator**:
- ❌ **Microphone access** - Simulator has no mic, tuner can't test
- ❌ **AudioWorklet** - Depends on mic input
- ❌ **Push Notifications** - Need physical device + APNs
- ❌ **Add to Home Screen** - Simulator Safari doesn't support
- ❌ **True offline testing** - Network simulation limited

## Recommended Simulator Tests

### 1. Web Crypto PBKDF2 (PIN System)

**In Simulator Safari, open Web Inspector**:
```bash
# Enable Web Inspector in Simulator
# Settings > Safari > Advanced > Web Inspector: ON

# On Mac: Safari > Develop > [Simulator] iPad mini > localhost
```

**Test PIN security**:
1. Navigate to `#view-parent`
2. Enter default PIN `1001`
3. Access parent section
4. Change PIN to `5678`
5. Refresh page
6. Try old PIN `1001` - should fail
7. Try new PIN `5678` - should succeed

**Console check**:
```javascript
// In Web Inspector console
const pinData = JSON.parse(localStorage.getItem('panda-violin:parent-pin-v2'));
console.log('PIN stored securely:', pinData);
// Expected: { hash: "...", salt: "...", createdAt: ... }
// hash and salt should be 64-char hex strings
```

### 2. IndexedDB Persistence

**Test data persistence**:
1. Navigate to Practice section
2. Mark a task complete
3. **Quit and restart simulator**:
   ```bash
   xcrun simctl shutdown booted
   xcrun simctl boot <DEVICE_UDID>
   xcrun simctl openurl booted "http://localhost:5173"
   ```
4. Navigate back to Practice
5. **Expected**: Task still marked complete

**Console check**:
```javascript
// Check storage estimate
const estimate = await navigator.storage.estimate();
console.log('Usage:', (estimate.usage / 1024).toFixed(2), 'KB');
console.log('Quota:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
// Expected: Non-zero usage, large quota
```

### 3. Visual Viewport (Keyboard Simulation)

**Test keyboard appearance**:
1. Navigate to Games section
2. Tap (click) text input field
3. **Simulator keyboard appears** (Hardware > Keyboard > Toggle Software Keyboard)
4. **Expected**: Input scrolls into view above keyboard

**Console monitoring**:
```javascript
// Monitor viewport changes
window.visualViewport.addEventListener('resize', () => {
    console.log('Viewport height:', window.visualViewport.height);
    console.log('Offset top:', window.visualViewport.offsetTop);
});
// Type in input - should log height changes when keyboard shows
```

### 4. Service Worker Caching

**Test offline capability** (simulated):
1. Load app in Simulator Safari
2. **Network throttling**:
   - Web Inspector > Network tab > Throttling > Offline
3. Refresh page
4. **Expected**: App still loads from Service Worker cache

**Console check**:
```javascript
// Check Service Worker
const regs = await navigator.serviceWorker.getRegistrations();
console.log('SW registered:', regs.length > 0);
console.log('SW active:', regs[0]?.active?.state);
// Expected: registered: true, active: "activated"

// Check caches
const cacheKeys = await caches.keys();
console.log('Caches:', cacheKeys);
// Expected: Array with cache names like "panda-violin-v1-static"
```

### 5. Touch Targets (Click Simulation)

**Test interactive elements**:
1. Click all buttons, toggles, links
2. **Check hit areas**:
   - Web Inspector > Elements > Computed > Box Model
   - Select button elements, verify width/height ≥44px
3. Test string selector (G, D, A, E buttons)
4. **Expected**: All elements easily clickable

**Console check**:
```javascript
// Measure touch targets
document.querySelectorAll('button, a, [role="button"]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
        console.warn('Small target:', el, rect.width, 'x', rect.height);
    }
});
// Expected: No warnings (all targets ≥44px)
```

## Physical Device Testing (Required)

**After Simulator validation**, test on real iPad mini (6th gen):

**Critical tests requiring physical device**:
1. **Microphone + Tuner** - Pitch detection latency and accuracy
2. **AudioWorklet** - Real-time audio processing performance
3. **Add to Home Screen** - PWA installation flow
4. **True offline** - Airplane Mode testing
5. **Badge updates** - Practice reminder badges
6. **Wake Lock** - Screen stays on during practice
7. **A15 performance** - Frame rates, memory usage

See `docs/safari-ipad-test-guide.md` for complete physical device test suite.

## Xcode Instruments Profiling

**For deep performance analysis on physical device**:

```bash
# Connect iPad via USB
# Xcode > Window > Devices and Simulators
# Select iPad > Use for Development

# Open app in Safari on iPad
# Xcode > Debug > Attach to Process by PID or Name... > Safari

# Instruments > Allocations (memory)
# Instruments > Time Profiler (CPU)
# Instruments > Network (API calls)
```

**Key metrics to capture**:
- Memory usage during AudioWorklet processing
- CPU usage for pitch detection
- Frame rate (should maintain 60fps)
- Network requests (Service Worker cache hits)

## Automated Testing Notes

**For CI/CD integration** (future):
- Simulator automation via `xcrun simctl`
- Playwright can connect to Simulator Safari
- Limited value without microphone testing
- Focus automation on: PIN security, storage, UI interactions

## Quick Validation Script

```bash
#!/bin/bash
# Quick Xcode Simulator validation

echo "Starting iPad mini simulator..."
DEVICE_UDID=$(xcrun simctl list devices | grep "iPad mini (6th generation)" | grep -oE '[0-9A-F-]{36}' | head -1)

if [ -z "$DEVICE_UDID" ]; then
    echo "iPad mini (6th generation) simulator not found"
    echo "Create one in Xcode: Window > Devices and Simulators"
    exit 1
fi

xcrun simctl boot "$DEVICE_UDID" 2>/dev/null || echo "Simulator already booted"

echo "Starting dev server..."
npm run dev -- --host &
DEV_PID=$!

sleep 3

echo "Opening app in Safari..."
xcrun simctl openurl booted "http://localhost:5173"

echo ""
echo "Simulator ready! Run manual tests from docs/xcode-simulator-testing.md"
echo "Press Ctrl+C to stop dev server when done"

wait $DEV_PID
```

Save as `test-simulator.sh`, run with `bash test-simulator.sh`
