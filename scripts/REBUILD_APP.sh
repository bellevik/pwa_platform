#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/build.sh"

require_app_slug "$@"

slug="$1"

ensure_app_exists "$slug"

regenerate_app_registry
build_single_app "$slug"

printf 'REBUILD_APP completed for %s.\n' "$slug"
