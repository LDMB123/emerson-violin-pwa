# Chromium-Only Files - Removal Recommendations

## Files NOT Compatible with Safari 26.2

Three files were created that use Chromium-only APIs not available in Safari/iOS:

### 1. `src/audio/codec-compressor.js`
**API**: Web Codecs API (AudioEncoder/AudioDecoder)
**Safari Support**: ❌ Not supported (Chromium 94+ only)
**Purpose**: Opus audio compression for recordings (80-90% size reduction)
**Status**: Never integrated, import removed from recordings.js

**Recommendation**:
- **Option A (Remove)**: Delete file - recordings work fine without compression
- **Option B (Safari Alternative)**: Replace with MediaRecorder-based compression (see `safari-26.2-compatibility-audit.md` section 2.1)

**Decision**: Recommend **Option A (Remove)** - MediaRecorder already uses WebM/Opus by default in Safari, providing good compression without additional code.

---

### 2. `src/platform/background-sync.js`
**API**: Background Sync API
**Safari Support**: ❌ Never in iOS (privacy restrictions), not in Safari
**Purpose**: Queue failed uploads for retry when connection restored
**Status**: Created but never integrated

**Recommendation**:
- **Option A (Remove)**: Delete file - uploads happen in foreground only
- **Option B (Safari Alternative)**: Implement online event + retry queue (see `safari-26.2-compatibility-audit.md` section 2.2)

**Decision**: Recommend **Option B (Safari Alternative)** if upload reliability is critical. The Safari alternative provides immediate retry when app is reopened and connection restored.

---

### 3. `src/platform/storage-buckets.js`
**API**: Storage Buckets API
**Safari Support**: ❌ Not supported (Chromium 122+ only)
**Purpose**: Separate storage quotas for user data vs cache
**Status**: Created but never integrated

**Recommendation**:
- **Option A (Remove)**: Delete file - single storage quota is sufficient
- **Option B (Safari Alternative)**: Use multiple IndexedDB databases for logical separation (see `safari-26.2-compatibility-audit.md` section 2.3)

**Decision**: Recommend **Option A (Remove)** - the app already works well with single storage quota. Logical separation provides no practical benefit without quota management.

---

### 4. `src/parent/pin-crypto.js`
**API**: Web Crypto API (PBKDF2)
**Safari Support**: ✅ Safari 11+ FULLY SUPPORTED
**Purpose**: Secure PIN hashing
**Status**: ✅ Integrated into `src/parent/pin.js`

**Action**: KEEP - This is Safari-compatible and actively used.

---

## Summary of Actions

### Immediate Actions (Completed ✅)
1. ✅ Removed Web Codecs import from `recordings.js`
2. ✅ Integrated Web Crypto PBKDF2 into `pin.js`
3. ✅ Initialized Badging API in `app.js`

### Cleanup Actions (Recommend)

**Recommended removals** (files that provide no value for Safari):
```bash
# Delete Chromium-only files
rm src/audio/codec-compressor.js
rm src/platform/storage-buckets.js

# Optionally keep background-sync.js if you want to implement Safari alternative later
# rm src/platform/background-sync.js
```

**Keep these files** (Safari-compatible):
- `src/parent/pin-crypto.js` - Web Crypto PBKDF2 (Safari 11+) ✅
- `src/notifications/badging.js` - Badging API (Safari 17+) ✅

---

## Alternative: Implement Safari Alternatives

If you want the functionality that Chromium-only APIs provided, implement Safari alternatives:

### 1. Audio Compression (if needed)
**Safari alternative**: MediaRecorder with WebM/Opus container
- Safari 14.5+ support
- 60-70% compression (vs 80-90% with Web Codecs)
- See `safari-26.2-compatibility-audit.md` section 2.1 for full implementation

### 2. Upload Queue (if needed)
**Safari alternative**: Online event + localStorage retry queue
- Works on Safari/iOS
- Immediate retry when app reopened and online
- No background retry (acceptable trade-off)
- See `safari-26.2-compatibility-audit.md` section 2.2 for full implementation

### 3. Storage Separation (NOT recommended)
**Safari alternative**: Multiple IndexedDB databases
- Logical separation only, no quota benefits
- See `safari-26.2-compatibility-audit.md` section 2.3
- **Not worth the complexity**

---

## Final Recommendation

**Remove all three Chromium-only files**:

```bash
rm src/audio/codec-compressor.js
rm src/platform/background-sync.js
rm src/platform/storage-buckets.js
```

**Reasoning**:
1. **codec-compressor.js**: MediaRecorder already provides Opus compression in Safari
2. **background-sync.js**: Foreground uploads are sufficient for practice app
3. **storage-buckets.js**: No practical benefit without quota management

**Keep Safari-compatible implementations**:
- ✅ `src/parent/pin-crypto.js` - Secure PIN hashing (actively used)
- ✅ `src/notifications/badging.js` - Practice reminders (integrated)

This leaves the app with:
- **A (92/100) grade** on Safari 26.2
- All core functionality working excellently
- No dead code or Chromium-only dependencies
- Two valuable Safari-compatible enhancements (Web Crypto + Badging)

---

## Testing Checklist

After removing Chromium-only files, verify:

1. **Recordings work** without compression
   - Record a song clip
   - Verify it saves and plays back
   - Check storage usage is reasonable

2. **Parent PIN works securely**
   - Set a new PIN
   - Lock and unlock parent section
   - Verify PIN stored as hash + salt (not plaintext)

3. **Badging updates correctly**
   - Complete practice tasks
   - Verify badge clears when tasks complete
   - Check badge shows count when app closed

4. **No console errors**
   - Check for missing imports
   - Verify no "module not found" errors
   - Confirm clean browser console

---

## Documentation Updates Needed

After cleanup, update these docs:

1. **`docs/api-native-tools-audit.md`**
   - Remove Web Codecs, Background Sync, Storage Buckets from recommendations
   - Focus only on Safari 26.2 compatible APIs

2. **`CLAUDE.md`** (optional)
   - Note Safari 26.2 as target platform
   - Document Web Crypto + Badging implementations

3. **`README.md`** (if exists)
   - List Safari 26.2 / iOS 26.2 as supported platforms
   - Mention PWA capabilities (offline, installable, secure PIN)
