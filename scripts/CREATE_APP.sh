#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"
source "$(dirname "$0")/lib/dry-run.sh"

acquire_platform_lock
require_base_tooling
print_operation_banner "CREATE_APP"
print_active_flag_summary

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

run_cmd node "$ROOT_DIR/scripts/create-app.mjs" "$@"

if [ "${PWA_PLATFORM_SKIP_INSTALL:-0}" = "1" ]; then
  printf 'Skipping workspace install after app creation because PWA_PLATFORM_SKIP_INSTALL=1.\n'
else
  printf 'Refreshing workspace dependencies for the new app...\n'
  run_cmd pnpm install
fi
