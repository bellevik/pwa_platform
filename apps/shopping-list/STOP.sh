#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx 'shopping-list-backend'; then
  printf 'Stopping shopping-list backend service...\n'
  docker compose -f "$COMPOSE_FILE" stop shopping-list-backend
else
  printf 'shopping-list backend service is not running.\n'
fi

printf 'STOP completed for shopping-list. Static frontend assets remain available if caddy is still running.\n'
