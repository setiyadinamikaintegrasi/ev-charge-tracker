#!/usr/bin/env sh
# Build the EV Charge Tracker: frontend first, then backend.
# Produces a single binary at src/backend/ev-charge-tracker that serves
# the API + the built frontend (from ../frontend/dist) on :8100.
#
# Usage:
#   sh scripts/build-ev.sh           # build only
#   sh scripts/build-ev.sh run       # build then run the binary
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/src/backend"
FRONTEND="$ROOT/src/frontend"
BINARY="$BACKEND/ev-charge-tracker"

echo "==> Building frontend (Vite → dist/)…"
cd "$FRONTEND"
if [ ! -d node_modules ]; then
  echo "    node_modules missing — running npm ci/install…"
  npm install
fi
npm run build

echo "==> Building backend (Go, CGO_ENABLED=0)…"
cd "$BACKEND"
CGO_ENABLED=0 go build -trimpath -o "$BINARY" .

echo "==> Done: $BINARY"

if [ "${1:-}" = "run" ]; then
  echo "==> Running on http://localhost:8100"
  cd "$BACKEND"
  exec "$BINARY"
fi
