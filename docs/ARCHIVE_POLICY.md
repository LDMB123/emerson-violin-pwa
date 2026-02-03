# Archive Policy

- Default: do not archive generated or legacy assets in-repo; rely on git history
- If archiving is required:
- Create `docs/archive/YYYY-MM-DD-<topic>/` for notes or decision logs
- Create `_archived/YYYY-MM-DD-<topic>/` only for large binary assets that must stay in repo
- Avoid duplicating files already present in `public/assets/` or `src/`
- Note archive intent in `docs/README.md`
