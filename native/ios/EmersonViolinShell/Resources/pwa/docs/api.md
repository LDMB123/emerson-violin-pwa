# Emerson Violin Studio Offline Docs

## Export Schema (v1)

- `schemaVersion`: number
- `exportedAt`: ISO string
- `appVersion`: string
- `deviceId`: string
- `profiles`: array
- `sessions`: array
- `recordings`: array
- `mlTraces`: array
- `gameScores`: array
- `scoreLibrary`: array
- `assignments`: array
- `telemetryQueue`: array
- `errorQueue`: array

## CSV Export

- First line: `# schemaVersion=1, exportedAt=..., appVersion=..., deviceId=...`
- Columns: `id,day_key,duration_minutes,note,created_at`

## Recording Metadata

- `mime_type`, `size_bytes`, `format`
- `opfs_path` (when stored in OPFS)

## Storage Buckets

- If `navigator.storageBuckets` is available, recordings are stored in the `recordings` bucket.

## Recording Export

- Export WAV for any recording (decoded + re-encoded).
- Export M4A when the original recording was captured as MP4/AAC or WebCodecs is available.

## Encrypted Backup (ZIP)

- File: `emerson-backup.zip`
- `manifest.json` includes `saltHex`, `ivHex`, `iterations`, `algorithm`
- Encrypted payload stored in `backup.enc` (AES-GCM with PBKDF2-derived key)
- Recording audio stored as `recordings/<id>.<format>.enc` with per-file IVs in the encrypted payload.

## Local Encryption

- Optional local encryption uses AES-GCM + PBKDF2 (PIN derived).
- Encrypted stores: sessions, recordings metadata, assignments, profiles, score library, game scores, ML traces, share inbox, telemetry + error queues, model cache.
- Encrypted records stored as `{ id, enc: true, iv, data, alg }` with hex-encoded payloads.

## Restore

- Import `emerson-backup.zip` + PIN to restore sessions, ML state, and recording metadata.

## Assignment Schema (v1)

- `schemaVersion`
- `assignmentId`
- `profileId`
- `title`
- `goals`
- `schedule`
- Assignment exports are wrapped in `{ schemaVersion, exportedAt, assignments }`

## ML API

- `window.EmersonML.v1.status()`
- `window.EmersonML.v1.scores()`
- `window.EmersonML.v1.get_thresholds()`
- `window.EmersonML.v1.set_thresholds(payload)`
- `window.EmersonML.v1.on_event((name, payload) => {})`
- `window.EmersonML.v1.off_event()`
- `ml_update` payload keys are snake_case (`pitch_score`, `rhythm_score`, `focus_score`, `focus_label`, `recommendation`, `plan_focus`, `pitch_target`, `rhythm_target`, `status`)

## ML Capture

- Enables local audio capture and stores traces in `mlTraces`.
- Trace fields may include `source` (`worklet`, `analyser`, `pose`) and `pose_confidence`.
- Pose traces may include `bow_angle_deg` and `posture_score`.

## Pose Pipeline

- `public/pose.js` exposes `window.EmersonPose.start()`/`stop()`.
- If MediaPipe Tasks Vision is available, it loads `./assets/models/pose_landmarker.task` via `FilesetResolver`.

## File Imports

- File Handling API (`launchQueue`) routes:
  - MusicXML (`.xml`, `.musicxml`) → `scoreLibrary`
  - PDF (`.pdf`) → `scoreLibrary` with `pdf_blob`
  - JSON → assignments or scores (auto-detected)
  - ZIP → encrypted backup restore (PIN required)
- Open from Files button uses the File System Access picker when available.
- CSV imports support session summaries with `id,day_key,duration_minutes,note,created_at` columns.
- CSV imports also accept:
  - Game scores (`id,game_type,score,streak,bpm,duration_ms,ended_at,profile_id,difficulty`)
  - ML traces (`timestamp,pitch_cents,rhythm_ms,pose_confidence,bow_angle_deg,posture_score,sample_index,source`)
  - Assignments (`id or assignmentId`, `title`, `goals`, `schedule`)
  - Profiles (`id or profile_id`, `name`)

## File Exports

- When "Save exports to Files" is enabled, exports use the File System Access save picker.
- If unavailable, exports fall back to browser downloads.
- Export status updates appear in the export panel.
- Diagnostics export creates `emerson-diagnostics.json` with capabilities and device info.

## PDF Rendering

- `public/pdf.js` wraps `pdfjs-dist` to render PDFs into `[data-score-visual]`.
- Emits `pdf-ready` and `pdf-page` events for score following updates.

## Model Manifest

- `./models/manifest.json` lists local ML models for the registry panel.
- Schema: `{ schemaVersion, models: [{ id, name, task, format, path, inputLen, outputLen }] }`
- Model cache stored in IndexedDB `modelCache` with `id`, `name`, `task`, `format`, `opfs_path`, `size_bytes`, `updated_at`.
- Downloaded model bytes stored in OPFS `/models`.
- When `ml-onnx` feature is enabled, ONNX models run locally with `tract-onnx`.

## Error Queue

- Captures `window.onerror` and `unhandledrejection` payloads into `errorQueue`.
- Exported from the Error Queue panel as `emerson-error-queue.json`.

## Score Following (MusicXML)

- Store entries in `scoreLibrary` with `id`, `title`, `measures`, `beats_per_measure`, `tempo_bpm`, `xml`.
- Following uses `ml-trace` rhythm onsets with an online alignment window to advance measures.
- PDF entries use `source: "pdf"` and `pdf_blob` for local viewing.

## Game Scores

- Stored in `gameScores` with `id`, `game_type`, `score`, `streak`, `bpm`, `duration_ms`, `ended_at`, `profile_id`, `difficulty`.

## Game Map

- `game-map:<profile_id>` in local storage tracks mastered nodes.
- Nodes unlock as stars are earned from game scores.

## Teacher Export (ZIP)

- `emerson-teacher-export.zip` contains `teacher-report.json` plus session, ML, scores, and library snapshots.

## Profiles

- Active profile stored in local storage key `profile:active`.
- Profile entries stored in `profiles` store with `id`, `name`, `created_at`.

## Deep Links

- `web+emerson-game://?type=rhythm`
- `web+emerson-session://?id=...`
