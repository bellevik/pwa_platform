#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/dry-run.sh"
source "$(dirname "$0")/lib/runtime.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling
require_runtime_tooling

ROOT_DIR="$(repo_root)"

printf 'Restarting entire platform...\n'
run_bash_script "$ROOT_DIR/scripts/STOP_ALL.sh"
run_bash_script "$ROOT_DIR/scripts/START_ALL.sh"

printf 'Confirming restarted platform health...\n'
if is_dry_run; then
  printf 'Skipping restart health confirmation because PWA_PLATFORM_DRY_RUN=1.\n'
else
  wait_for_platform_runtime 90
fi

printf 'RESTART_ALL completed successfully.\n'
