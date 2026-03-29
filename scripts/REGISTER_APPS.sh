#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"
source "$(dirname "$0")/lib/dry-run.sh"

acquire_platform_lock
require_base_tooling
print_operation_banner "REGISTER_APPS"
print_active_flag_summary

run_cmd node scripts/register-apps.mjs
