#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling
require_runtime_tooling

ROOT_DIR="$(repo_root)"

while IFS= read -r slug; do
  if [ -z "$slug" ]; then
    continue
  fi

  printf 'Testing app: %s\n' "$slug"
  PWA_PLATFORM_SKIP_APP_VERIFY=1 bash "$ROOT_DIR/scripts/TEST_APP.sh" "$slug"
done < <(list_app_slugs)

printf 'Running final platform verification...\n'
bash "$ROOT_DIR/scripts/VERIFY_PLATFORM.sh"

printf 'TEST_ALL completed successfully.\n'
