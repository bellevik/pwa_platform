#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_app_slug "$@"

slug="$1"
ROOT_DIR="$(repo_root)"

ensure_app_exists "$slug"

printf 'Running app test script for %s...\n' "$slug"
bash "$(app_dir "$slug")/TEST.sh"

printf 'Running app verification for %s...\n' "$slug"
bash "$ROOT_DIR/scripts/VERIFY_APP.sh" "$slug"

printf 'TEST_APP completed for %s.\n' "$slug"
