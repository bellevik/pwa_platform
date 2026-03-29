#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/build.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling

require_app_slug "$@"

slug="$1"

ensure_app_exists "$slug"

regenerate_app_registry
build_single_app "$slug"

printf 'REBUILD_APP completed for %s.\n' "$slug"
