#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_app_slug "$@"

slug="$1"
ROOT_DIR="$(repo_root)"

ensure_app_exists "$slug"

printf 'Regenerating app registry before rebuild...\n'
bash "$ROOT_DIR/scripts/REGISTER_APPS.sh"

printf 'Rebuilding frontend for %s...\n' "$slug"
pnpm --filter "$(app_frontend_package "$slug")" build

if [ "$(app_has_backend "$slug")" = "true" ]; then
  printf 'Rebuilding backend for %s...\n' "$slug"
  pnpm --filter "$(app_backend_package "$slug")" build
fi

printf 'REBUILD_APP completed for %s.\n' "$slug"
