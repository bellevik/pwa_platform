#!/usr/bin/env bash
set -euo pipefail

missing_command_message() {
  local command_name="$1"
  printf 'Missing required command: %s\n' "$command_name" >&2
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    missing_command_message "$command_name"
    return 1
  fi
}

require_base_tooling() {
  require_command node
  require_command pnpm
  require_command python3
}

require_runtime_tooling() {
  require_command docker
  require_command curl
}
