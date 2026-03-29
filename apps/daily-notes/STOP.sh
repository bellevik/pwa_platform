#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if [ "false" = "true" ]; then
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx 'daily-notes-backend'; then
    printf 'Stopping daily-notes backend service...\n'
    docker compose -f "$COMPOSE_FILE" stop daily-notes-backend
  else
    printf 'daily-notes backend service is not running.\n'
  fi
else
  printf 'daily-notes has no backend service to stop.\n'
fi

printf 'STOP completed for daily-notes. Static frontend assets remain available if caddy is still running.\n'
