#!/usr/bin/env bash
#
# Start the integration test server using the ObjectStack CLI.
#
# This replaces the former `server/hotcrm` git submodule: instead of building a
# separate CRM app, we boot a minimal ObjectStack stack (`server/integration/`)
# with the `objectstack` CLI, an in-memory driver, and the auth plugin. That is
# all the `__tests__/integration/server/*` suite needs (auth + a couple of CRM
# objects exposed over the real v7 REST API).
#
# Usage:
#   ./scripts/start-integration-server.sh          # foreground (default)
#   ./scripts/start-integration-server.sh --bg     # background (writes PID to .integration-server.pid)
#
# Environment:
#   PORT          – server port (default 4000)
#   AUTH_SECRET   – auth plugin secret (default: a dev value, min 32 chars)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_DIR="$ROOT_DIR/server/integration"
PORT="${PORT:-4000}"
AUTH_SECRET="${AUTH_SECRET:-integration-secret-please-change-min-32-chars}"

if [ ! -f "$STACK_DIR/objectstack.config.ts" ]; then
  echo "❌ Integration stack not found at $STACK_DIR/objectstack.config.ts"
  exit 1
fi

# Resolve the objectstack CLI from the workspace node_modules.
CLI="$ROOT_DIR/node_modules/@objectstack/cli/bin/run.js"
if [ ! -f "$CLI" ]; then
  echo "❌ @objectstack/cli not installed. Run: pnpm install"
  exit 1
fi

start_cmd=(
  node "$CLI" start
  --home "$STACK_DIR"
  --database-driver memory
  --auth-secret "$AUTH_SECRET"
  -p "$PORT"
)

if [ "${1:-}" = "--bg" ]; then
  echo "🚀 Starting integration server in background on port $PORT…"
  nohup "${start_cmd[@]}" > "$ROOT_DIR/.integration-server.log" 2>&1 &
  SERVER_PID=$!
  echo "$SERVER_PID" > "$ROOT_DIR/.integration-server.pid"
  echo "   PID $SERVER_PID (logs: .integration-server.log)"
else
  echo "🚀 Starting integration server on port $PORT…"
  exec "${start_cmd[@]}"
fi
