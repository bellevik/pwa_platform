#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling
require_runtime_tooling

require_app_slug "$@"

slug="$1"
ROOT_DIR="$(repo_root)"

ensure_app_exists "$slug"

printf 'Running app test script for %s...\n' "$slug"
bash "$(app_dir "$slug")/TEST.sh"

if [ "${PWA_PLATFORM_SKIP_APP_VERIFY:-0}" = "1" ]; then
  printf 'Skipping app verification for %s because PWA_PLATFORM_SKIP_APP_VERIFY=1.\n' "$slug"
else
  printf 'Running app verification for %s...\n' "$slug"
  bash "$ROOT_DIR/scripts/VERIFY_APP.sh" "$slug"
fi

printf 'TEST_APP completed for %s.\n' "$slug"
