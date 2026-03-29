#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/runtime.sh"

ROOT_DIR="$(repo_root)"

printf 'Building platform before start...\n'
bash "$ROOT_DIR/scripts/BUILD_ALL.sh"

printf 'Starting Docker Compose runtime...\n'
docker compose -f "$ROOT_DIR/ops/docker-compose.yml" up -d --force-recreate

printf 'Waiting for platform runtime to become healthy...\n'
wait_for_platform_runtime 90

printf 'START_ALL completed successfully.\n'
