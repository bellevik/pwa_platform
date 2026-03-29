#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/build.sh"
source "$(dirname "$0")/lib/runtime.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling
require_runtime_tooling

require_app_slug "$@"

slug="$1"
ROOT_DIR="$(repo_root)"

ensure_app_exists "$slug"

if [ "${PWA_PLATFORM_SKIP_BUILD:-0}" = "1" ]; then
  printf 'Skipping app rebuild because PWA_PLATFORM_SKIP_BUILD=1.\n'
else
  printf 'Rebuilding app before restart: %s\n' "$slug"
  regenerate_app_registry
  build_single_app "$slug"
fi

if [ "$(app_has_backend "$slug")" = "true" ]; then
  service_name="$(app_backend_service "$slug")"
  printf 'Restarting backend service for %s...\n' "$slug"
  docker compose -f "$ROOT_DIR/ops/docker-compose.yml" restart "$service_name"
  printf 'Refreshing caddy after backend restart...\n'
  docker compose -f "$ROOT_DIR/ops/docker-compose.yml" restart caddy
  printf 'Waiting for %s runtime health...\n' "$slug"
  wait_for_service_running "$service_name" 60
  wait_for_service_running caddy 60
  wait_for_http_ok "http://127.0.0.1/api/$slug/health/" 60
else
  printf 'No backend service for %s; static assets are already rebuilt.\n' "$slug"
fi

printf 'RESTART_APP completed for %s.\n' "$slug"
