#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"
source "$(dirname "$0")/lib/dry-run.sh"

acquire_platform_lock
require_base_tooling

if [ "$#" -ne 1 ]; then
  printf 'Usage: %s <slug>\n' "$0" >&2
  exit 1
fi

print_operation_banner "VERIFY_APP $1"
print_active_flag_summary

run_cmd node scripts/verify-app.mjs "$1"
