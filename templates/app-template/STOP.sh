#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if [ "__HAS_BACKEND__" = "true" ]; then
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx '__APP_SLUG__-backend'; then
    printf 'Stopping __APP_SLUG__ backend service...\n'
    docker compose -f "$COMPOSE_FILE" stop __APP_SLUG__-backend
  else
    printf '__APP_SLUG__ backend service is not running.\n'
  fi
else
  printf '__APP_SLUG__ has no backend service to stop.\n'
fi

printf 'STOP completed for __APP_SLUG__. Static frontend assets remain available if caddy is still running.\n'
