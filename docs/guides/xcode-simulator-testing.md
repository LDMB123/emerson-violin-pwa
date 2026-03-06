# Xcode Simulator Testing - iPad mini (6th Gen)

Use Simulator for quick Safari/UI validation before moving to a physical iPad.

## Start the Simulator

```bash
# Find an iPad mini simulator
xcrun simctl list devices | grep "iPad mini"

# Boot the target device
xcrun simctl boot <DEVICE_UDID>
```

Or create one in Xcode: `Window > Devices and Simulators`.

## Start the App

```bash
npm install  # if needed
npm run dev -- --host
xcrun simctl openurl booted "http://localhost:5173"
```

## Connect Web Inspector

1. In the simulator, open `Settings > Safari > Advanced` and enable **Web Inspector**.
2. On the Mac, enable Safari's Develop menu if needed: `Safari > Settings > Advanced > Show features for web developers`.
3. In macOS Safari, attach to the page through `Develop > Simulator > localhost`.

## What Simulator Can Validate

Works well:
- Web Crypto / PIN flows
- IndexedDB and local persistence
- Service worker registration and cache behavior
- Visual Viewport / keyboard layout handling
- click-target sizing and most UI interactions
- API capability checks for wake lock and badging

Do not treat Simulator as authoritative for:
- microphone input and tuner behavior
- AudioWorklet latency under real device conditions
- Add to Home Screen install flow
- real offline / reconnection behavior
- push notification behavior
- true badge presentation on iPad Home Screen

## Recommended Simulator Checks

### 1. Parent PIN security

Steps:
1. Open `#view-parent`.
2. Verify default PIN `1001` works.
3. Change the PIN.
4. Refresh and confirm the old PIN fails and the new one succeeds.

Console check:
```javascript
JSON.parse(localStorage.getItem('panda-violin:parent-pin-v2'))
```

Pass if the stored value is hashed and the PIN change survives reload.

### 2. IndexedDB persistence

Steps:
1. Open **Practice Coach**.
2. Change saved state.
3. Shut down and reboot the simulator.
4. Reopen the app.
5. Confirm state is still present.

Console check:
```javascript
await navigator.storage.estimate()
```

Pass if saved state survives simulator restart.

### 3. Keyboard / Visual Viewport

Steps:
1. Focus a text input.
2. Toggle the software keyboard if needed.
3. Confirm the field stays visible above the keyboard.

Console check:
```javascript
window.visualViewport.addEventListener('resize', () => {
  console.log(window.visualViewport.height, window.visualViewport.offsetTop);
});
```

Pass if the layout recovers cleanly when the keyboard appears and disappears.

### 4. Service worker cache behavior

Steps:
1. Load the app once online.
2. In Web Inspector, switch Network throttling to Offline.
3. Refresh.

Console checks:
```javascript
await navigator.serviceWorker.getRegistrations();
await caches.keys();
```

Pass if the app still loads from cache and the service worker stays active.

### 5. Click-target sizing

Steps:
1. Click primary buttons, toggles, links, and tuner string selectors.
2. Inspect any questionable controls in Web Inspector.

Console check:
```javascript
document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
  const rect = el.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 44) console.warn('Small target', el, rect);
});
```

Pass if there are no obvious undersized targets or dead click zones.

## Physical Device Follow-Up Still Required

Move to a real iPad mini for:
- microphone + tuner accuracy
- AudioWorklet performance
- Home Screen install flow
- true offline testing
- wake lock behavior
- badge behavior
- device-level performance and memory checks

Use [docs/guides/safari-ipad-test-guide.md](safari-ipad-test-guide.md) for the full device runbook.

## Instruments

For deeper profiling on a physical device:
- attach Safari from Xcode
- use Time Profiler for CPU
- use Allocations for memory
- use Network to confirm request/cache behavior

## Quick Helper Script

```bash
#!/bin/bash
DEVICE_UDID=$(xcrun simctl list devices | grep "iPad mini (6th generation)" | grep -oE '[0-9A-F-]{36}' | head -1)
[ -n "$DEVICE_UDID" ] || { echo "iPad mini simulator not found"; exit 1; }

xcrun simctl boot "$DEVICE_UDID" 2>/dev/null || true
npm run dev -- --host &
DEV_PID=$!
sleep 3
xcrun simctl openurl booted "http://localhost:5173"
wait $DEV_PID
```

Use this only as a convenience launcher; the manual checklist above is still the real validation path.
