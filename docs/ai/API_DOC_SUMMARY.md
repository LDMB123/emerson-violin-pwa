# API Docs Summary (Token-Optimized)

- Source: `public/docs/api.md`

## Export Schema (v1)
- Fields: `schemaVersion`, `exportedAt`, `appVersion`, `deviceId`, `profiles`, `sessions`, `recordings`, `mlTraces`, `gameScores`, `scoreLibrary`, `assignments`, `telemetryQueue`

## CSV Export
- Header: `# schemaVersion=1, exportedAt=..., appVersion=..., deviceId=...`
- Columns: `id,day_key,duration_minutes,note,created_at`

## Recording Metadata
- `mime_type`, `size_bytes`, `format`, `opfs_path` (if stored in OPFS)

## Encrypted Backup
- File: `emerson-backup.zip`
- `manifest.json`: `saltHex`, `ivHex`, `iterations`, `algorithm`
- Payload: `backup.enc` (AES-GCM + PBKDF2)
- Recordings: `recordings/<id>.<format>.enc` with per-file IVs

## Restore
- Import `emerson-backup.zip` + PIN restores sessions, ML state, recording metadata

## Assignment Schema (v1)
- `schemaVersion`, `assignmentId`, `profileId`, `title`, `goals`, `schedule`

## ML API
- `window.EmersonML.v1.status()`
- `window.EmersonML.v1.scores()`
- `window.EmersonML.v1.get_thresholds()`
- `window.EmersonML.v1.set_thresholds(payload)`

## ML Capture
- Stores traces in `mlTraces`
- Trace fields include `source` (`worklet`, `analyser`, `pose`) and `pose_confidence`

## Score Following
- `scoreLibrary` entries: `id`, `title`, `measures`, `beats_per_measure`, `xml`
- Uses ML trace rhythm onsets

## Game Scores
- `gameScores` fields: `id`, `game_type`, `score`, `streak`, `bpm`, `duration_ms`, `ended_at`

## Teacher Export
- `emerson-teacher-export.zip` includes `teacher-report.json` + snapshots

## Deep Links
- `web+emerson-game://?type=rhythm`
- `web+emerson-session://?id=...`
