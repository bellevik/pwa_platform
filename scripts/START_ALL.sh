#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/build.sh"
source "$(dirname "$0")/lib/runtime.sh"
source "$(dirname "$0")/lib/lock.sh"

acquire_platform_lock

ROOT_DIR="$(repo_root)"

if [ "${PWA_PLATFORM_SKIP_BUILD:-0}" = "1" ]; then
  printf 'Skipping platform build because PWA_PLATFORM_SKIP_BUILD=1.\n'
else
  printf 'Building platform before start...\n'
  install_workspace_dependencies
  regenerate_app_registry
  build_shell_package
  build_all_apps
fi

printf 'Starting Docker Compose runtime...\n'
docker compose -f "$ROOT_DIR/ops/docker-compose.yml" up -d --force-recreate

printf 'Waiting for platform runtime to become healthy...\n'
wait_for_platform_runtime 90

printf 'START_ALL completed successfully.\n'
