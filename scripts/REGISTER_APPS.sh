#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"
source "$(dirname "$0")/lib/dry-run.sh"

acquire_platform_lock
require_base_tooling

run_cmd node scripts/register-apps.mjs
