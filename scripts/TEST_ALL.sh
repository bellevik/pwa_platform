#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

ROOT_DIR="$(repo_root)"

while IFS= read -r slug; do
  if [ -z "$slug" ]; then
    continue
  fi

  printf 'Testing app: %s\n' "$slug"
  bash "$ROOT_DIR/scripts/TEST_APP.sh" "$slug"
done < <(list_app_slugs)

printf 'Running final platform verification...\n'
bash "$ROOT_DIR/scripts/VERIFY_PLATFORM.sh"

printf 'TEST_ALL completed successfully.\n'
