#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if [ "true" = "true" ]; then
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx 'megafactory-mobile-backend'; then
    printf 'Stopping megafactory-mobile backend service...\n'
    docker compose -f "$COMPOSE_FILE" stop megafactory-mobile-backend
  else
    printf 'megafactory-mobile backend service is not running.\n'
  fi
else
  printf 'megafactory-mobile has no backend service to stop.\n'
fi

printf 'STOP completed for megafactory-mobile. Static frontend assets remain available if caddy is still running.\n'
