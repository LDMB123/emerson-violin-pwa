# iPad mini 6 Capture Workflow

## On Device (iPad mini 6)
1. Open the app (Home Screen install preferred).
2. Go to `Settings → Performance → Baseline metrics`.
3. Tap **Record baseline snapshot**.
4. Tap **Export baseline JSON** and save to Files.
5. Take a screenshot of the Baseline metrics section.

## On Mac (this repo)
1. Copy the exported JSON and screenshot into a local folder, e.g. `~/Downloads/`.
2. Run the bundle script:

```bash
node scripts/qa/perf-bundle.js --input ~/Downloads/panda-violin-perf-*.json --screenshot ~/Downloads/perf.png
```

3. The script writes a new bundle into `docs/reports/qa/perf/<timestamp>/` containing:
   - `perf.json`
   - `perf-report.md`
   - `build-meta.json`
   - `screenshot.png`

## Optional: Include QA Screenshots
If you have a running preview server, you can add a folder of screenshots to the bundle:

```bash
node scripts/qa/perf-bundle.js --input ~/Downloads/panda-violin-perf-*.json --screenshots-dir docs/reports/qa/screenshots/ipad
```
