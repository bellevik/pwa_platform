#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/build.sh"

install_workspace_dependencies
regenerate_app_registry
build_shell_package
build_all_apps

printf 'BUILD_ALL completed successfully.\n'
