#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/build.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling
print_operation_banner "BUILD_ALL"
print_active_flag_summary

install_workspace_dependencies
regenerate_app_registry
build_shell_package
build_all_apps

printf 'BUILD_ALL completed successfully.\n'
