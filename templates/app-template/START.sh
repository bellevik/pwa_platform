#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx 'caddy'; then
  printf 'Platform runtime already active; refreshing __APP_SLUG__...\n'
  bash "$ROOT_DIR/scripts/RESTART_APP.sh" __APP_SLUG__
else
  printf 'Platform runtime is not active; starting the full platform...\n'
  bash "$ROOT_DIR/scripts/START_ALL.sh"
fi

printf 'START completed for __APP_SLUG__.\n'
