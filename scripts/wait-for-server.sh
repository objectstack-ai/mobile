#!/usr/bin/env bash
#
# Wait until a server is accepting HTTP connections.
#
# Usage:
#   ./scripts/wait-for-server.sh [URL] [TIMEOUT_SECONDS]
#
# Defaults:
#   URL     = http://localhost:4000/api/v1/auth/get-session
#   TIMEOUT = 60

set -euo pipefail

URL="${1:-http://localhost:4000/api/v1/auth/get-session}"
TIMEOUT="${2:-60}"

echo "⏳ Waiting for server at $URL (timeout: ${TIMEOUT}s)…"

ELAPSED=0
while [ "$ELAPSED" -lt "$TIMEOUT" ]; do
  if curl -sf -o /dev/null "$URL" 2>/dev/null; then
    echo "✅ Server is ready (${ELAPSED}s)"
    exit 0
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "❌ Server did not become ready within ${TIMEOUT}s"
exit 1
