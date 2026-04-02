#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if [ "false" = "true" ]; then
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx 'flappy-bird-backend'; then
    printf 'Stopping flappy-bird backend service...\n'
    docker compose -f "$COMPOSE_FILE" stop flappy-bird-backend
  else
    printf 'flappy-bird backend service is not running.\n'
  fi
else
  printf 'flappy-bird has no backend service to stop.\n'
fi

printf 'STOP completed for flappy-bird. Static frontend assets remain available if caddy is still running.\n'
