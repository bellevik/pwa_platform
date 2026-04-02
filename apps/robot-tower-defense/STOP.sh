#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker-compose.yml"

if [ "false" = "true" ]; then
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx 'robot-tower-defense-backend'; then
    printf 'Stopping robot-tower-defense backend service...\n'
    docker compose -f "$COMPOSE_FILE" stop robot-tower-defense-backend
  else
    printf 'robot-tower-defense backend service is not running.\n'
  fi
else
  printf 'robot-tower-defense has no backend service to stop.\n'
fi

printf 'STOP completed for robot-tower-defense. Static frontend assets remain available if caddy is still running.\n'
