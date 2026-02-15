#!/bin/sh
set -eu

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "[hooks:install] .git/hooks not found; run from a git checkout"
  exit 1
fi

cat >"$PRE_PUSH_HOOK" <<'EOF'
#!/bin/sh
set -eu

if ! command -v npm >/dev/null 2>&1; then
  echo "[pre-push] npm is required to run stash audit"
  exit 1
fi

echo "[pre-push] running stash audit"
if ! npm run -s stash:audit; then
  echo "[pre-push] blocked: stash audit failed (large stash or audit error)"
  echo "[pre-push] tip: inspect with 'npm run stash:audit' and clean with 'git stash clear'"
  exit 1
fi
EOF

chmod +x "$PRE_PUSH_HOOK"
echo "[hooks:install] installed $PRE_PUSH_HOOK"
