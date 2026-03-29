#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/runtime.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_runtime_tooling

ROOT_DIR="$(repo_root)"

printf 'Stopping Docker Compose runtime...\n'
docker compose -f "$ROOT_DIR/ops/docker-compose.yml" down

printf 'Verifying all services are stopped...\n'
assert_no_running_services

printf 'STOP_ALL completed successfully.\n'
