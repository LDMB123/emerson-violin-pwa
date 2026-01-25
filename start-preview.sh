#!/usr/bin/env bash
set -euo pipefail

PORT=${1:-5173}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

IP=""
for iface in en0 en1; do
  IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [[ -n "$IP" ]]; then break; fi
done
if [[ -z "$IP" ]]; then
  IP=$(ifconfig | awk '/inet / && $2 !~ /^127/ {print $2; exit}')
fi

cat <<MSG
Preview server starting (HTTP):
- Local:    http://localhost:$PORT
- Network:  http://$IP:$PORT

Note: iOS/iPadOS requires HTTPS to install as a PWA.
Use this for preview, or host on HTTPS to install.

Press Ctrl+C to stop.
MSG

python3 -m http.server "$PORT"
