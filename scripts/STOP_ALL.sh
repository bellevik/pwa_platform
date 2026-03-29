#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/dry-run.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/runtime.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_runtime_tooling
print_operation_banner "STOP_ALL"
print_active_flag_summary

ROOT_DIR="$(repo_root)"

printf 'Stopping Docker Compose runtime...\n'
run_cmd docker compose -f "$ROOT_DIR/ops/docker-compose.yml" down

printf 'Verifying all services are stopped...\n'
if is_dry_run; then
  printf 'Skipping stopped-service assertion because PWA_PLATFORM_DRY_RUN=1.\n'
else
  assert_no_running_services
fi

printf 'STOP_ALL completed successfully.\n'
