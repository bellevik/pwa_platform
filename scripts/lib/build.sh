#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
source "$(dirname "${BASH_SOURCE[0]}")/dry-run.sh"

install_workspace_dependencies() {
  if [ "${PWA_PLATFORM_SKIP_INSTALL:-0}" = "1" ]; then
    printf 'Skipping workspace dependency install because PWA_PLATFORM_SKIP_INSTALL=1.\n'
    return 0
  fi

  printf 'Installing workspace dependencies...\n'
  run_cmd pnpm install
}

regenerate_app_registry() {
  local root_dir
  root_dir="$(repo_root)"

  printf 'Generating app registry...\n'
  run_bash_script "$root_dir/scripts/REGISTER_APPS.sh"
}

build_shell_package() {
  printf 'Building shell...\n'
  run_cmd pnpm --filter @pwa-platform/shell build
}

build_app_frontend() {
  local slug="$1"
  printf 'Building app frontend: %s\n' "$slug"
  run_cmd pnpm --filter "$(app_frontend_package "$slug")" build
}

build_app_backend() {
  local slug="$1"
  if [ "$(app_has_backend "$slug")" != "true" ]; then
    return 0
  fi

  printf 'Building app backend: %s\n' "$slug"
  run_cmd pnpm --filter "$(app_backend_package "$slug")" build
}

build_all_apps() {
  local slug

  while IFS= read -r slug; do
    if [ -z "$slug" ]; then
      continue
    fi

    build_app_frontend "$slug"
    build_app_backend "$slug"
  done < <(list_app_slugs)
}

build_single_app() {
  local slug="$1"

  ensure_app_exists "$slug"
  build_app_frontend "$slug"
  build_app_backend "$slug"
}
