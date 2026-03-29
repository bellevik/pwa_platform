#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

ROOT_DIR="$(repo_root)"

printf 'Installing workspace dependencies...\n'
pnpm install

printf 'Generating app registry...\n'
bash "$ROOT_DIR/scripts/REGISTER_APPS.sh"

printf 'Building shell...\n'
pnpm --filter @pwa-platform/shell build

while IFS= read -r slug; do
  if [ -z "$slug" ]; then
    continue
  fi

  printf 'Building app frontend: %s\n' "$slug"
  pnpm --filter "$(app_frontend_package "$slug")" build

  if [ "$(app_has_backend "$slug")" = "true" ]; then
    printf 'Building app backend: %s\n' "$slug"
    pnpm --filter "$(app_backend_package "$slug")" build
  fi
done < <(list_app_slugs)

printf 'BUILD_ALL completed successfully.\n'
