#!/usr/bin/env bash
#
# Stop the background HotCRM integration test server.
#
# Reads the PID from .hotcrm-server.pid written by start-integration-server.sh --bg
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$ROOT_DIR/.hotcrm-server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "ℹ️  No PID file found – server may not be running."
  exit 0
fi

PID="$(cat "$PID_FILE")"

if kill -0 "$PID" 2>/dev/null; then
  echo "🛑 Stopping HotCRM server (PID $PID)…"
  kill "$PID"
  # Wait briefly for graceful shutdown
  for _ in $(seq 1 10); do
    kill -0 "$PID" 2>/dev/null || break
    sleep 1
  done
  # Force kill if still running
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null || true
  fi
  echo "✅ Server stopped."
else
  echo "ℹ️  Process $PID is not running."
fi

rm -f "$PID_FILE"
