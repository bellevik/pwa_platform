#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"
source "$(dirname "$0")/lib/dry-run.sh"

acquire_platform_lock
require_base_tooling
print_operation_banner "VERIFY_PLATFORM"
print_active_flag_summary

printf 'Generating app registry...\n'
run_bash_script scripts/REGISTER_APPS.sh

printf 'Building shell...\n'
run_cmd pnpm --filter @pwa-platform/shell build

printf 'Verifying registry and shell artifacts...\n'
run_cmd node scripts/verify-platform.mjs
