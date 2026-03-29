#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

lock_root_dir() {
  printf '%s/.opencode-locks\n' "$(repo_root)"
}

acquire_platform_lock() {
  if [ "${PWA_PLATFORM_LOCK_HELD:-0}" = "1" ]; then
    return 0
  fi

  acquire_script_lock platform-ops
  export PWA_PLATFORM_LOCK_HELD=1
}

acquire_script_lock() {
  local lock_name="$1"
  local lock_dir
  local started_at
  local timeout_seconds

  timeout_seconds="${PWA_PLATFORM_LOCK_TIMEOUT:-30}"
  lock_dir="$(lock_root_dir)/$lock_name.lock"

  mkdir -p "$(lock_root_dir)"
  started_at="$(date +%s)"

  while ! mkdir "$lock_dir" 2>/dev/null; do
    if [ $(( $(date +%s) - started_at )) -ge "$timeout_seconds" ]; then
      printf 'Timed out waiting for lock: %s\n' "$lock_name" >&2
      printf 'If no operation is active, remove %s manually.\n' "$lock_dir" >&2
      return 1
    fi

    sleep 1
  done

  printf '%s\n' "$$" > "$lock_dir/pid"
  trap "release_script_lock '$lock_name'" EXIT
}

release_script_lock() {
  local lock_name="$1"
  local lock_dir

  lock_dir="$(lock_root_dir)/$lock_name.lock"
  rm -rf "$lock_dir"
}
