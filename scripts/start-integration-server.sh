#!/usr/bin/env bash
#
# Start the HotCRM integration test server.
#
# Usage:
#   ./scripts/start-integration-server.sh          # foreground (default)
#   ./scripts/start-integration-server.sh --bg      # background (writes PID to .hotcrm-server.pid)
#
# Environment:
#   PORT               – server port (default 4000)
#   HOTCRM_DIR         – path to the hotcrm submodule (default server/hotcrm)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOTCRM_DIR="${HOTCRM_DIR:-$ROOT_DIR/server/hotcrm}"
PORT="${PORT:-4000}"

if [ ! -d "$HOTCRM_DIR/packages" ]; then
  echo "❌ HotCRM submodule not found at $HOTCRM_DIR"
  echo "   Run: git submodule update --init --recursive"
  exit 1
fi

echo "📦 Installing HotCRM dependencies…"
cd "$HOTCRM_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "🔨 Building HotCRM packages…"
pnpm build

export PORT

if [ "${1:-}" = "--bg" ]; then
  echo "🚀 Starting HotCRM server in background on port $PORT…"
  nohup pnpm dev > "$ROOT_DIR/.hotcrm-server.log" 2>&1 &
  SERVER_PID=$!
  echo "$SERVER_PID" > "$ROOT_DIR/.hotcrm-server.pid"
  echo "   PID: $SERVER_PID"
  echo "   Log: $ROOT_DIR/.hotcrm-server.log"
else
  echo "🚀 Starting HotCRM server on port $PORT…"
  exec pnpm dev
fi
