#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/runtime.sh"

ROOT_DIR="$(repo_root)"

printf 'Restarting entire platform...\n'
bash "$ROOT_DIR/scripts/STOP_ALL.sh"
bash "$ROOT_DIR/scripts/START_ALL.sh"

printf 'Confirming restarted platform health...\n'
wait_for_platform_runtime 90

printf 'RESTART_ALL completed successfully.\n'
