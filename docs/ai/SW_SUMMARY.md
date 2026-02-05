# Service Worker Summary (Token-Optimized)

- File: `public/sw.js`
- Cache names: `emerson-violin-shell-v208` + `emerson-violin-packs-v208`
- Precache: uses `public/sw-assets.js` when available; fallback list `./`, `./index.html`, `./manifest.webmanifest`, `./offline.html`
- IndexedDB bootstrap: `emerson-violin-db` v4 with stores `sessions`, `recordings`, `syncQueue`, `shareInbox`, `mlTraces`, `gameScores`, `scoreLibrary`, `assignments`, `profiles`, `telemetryQueue`, `errorQueue`, `scoreScans`
- Fetch strategy: cache-first for documents + assets; allowlisted network for API endpoints
- Allowlist paths: `/api/telemetry`, `/api/errors`, `/api/push/subscribe`, `/api/push/schedule`, `/api/push/public-key`, `/api/pwa/update`, `/pwa-manifest.json`
- Share target: handles POST to `/share-target`, stores files in `shareInbox`, redirects to `#core`
- Messages: `SKIP_WAITING`, `ROLLBACK_CACHE`, `CONFIRM_CACHE`, `CACHE_STATS`, `CLEAR_PACKS`
- Push: shows notification, default route `#overview`, icon/badge `assets/icons/icon-192.png`
- Notification click: focus existing client or open new window
- Background sync: `session-sync` drains `syncQueue`, posts `SYNC_COMPLETE`
