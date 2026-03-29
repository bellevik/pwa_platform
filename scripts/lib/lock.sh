#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

lock_root_dir() {
  printf '%s/.opencode-locks\n' "$(repo_root)"
}

current_operation_label() {
  basename "$0"
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
    if lock_is_stale "$lock_dir"; then
      printf 'Recovering stale lock for %s...\n' "$lock_name" >&2
      rm -rf "$lock_dir"
      continue
    fi

    if [ $(( $(date +%s) - started_at )) -ge "$timeout_seconds" ]; then
      printf 'Timed out waiting for lock: %s\n' "$lock_name" >&2
      print_lock_details "$lock_dir" >&2
      printf 'If no operation is active, remove %s manually.\n' "$lock_dir" >&2
      return 1
    fi

    sleep 1
  done

  printf '%s\n' "$$" > "$lock_dir/pid"
  printf '%s\n' "$(current_operation_label)" > "$lock_dir/script"
  printf '%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$lock_dir/started_at"
  printf '%s\n' "$PWD" > "$lock_dir/cwd"
  trap "release_script_lock '$lock_name'" EXIT
}

release_script_lock() {
  local lock_name="$1"
  local lock_dir
  local pid_file
  local owner_pid

  lock_dir="$(lock_root_dir)/$lock_name.lock"
  pid_file="$lock_dir/pid"

  if [ ! -d "$lock_dir" ]; then
    return 0
  fi

  if [ -f "$pid_file" ]; then
    owner_pid="$(cat "$pid_file")"
    if [ "$owner_pid" != "$$" ]; then
      return 0
    fi
  fi

  rm -rf "$lock_dir"
}

lock_is_stale() {
  local lock_dir="$1"
  local pid_file
  local owner_pid

  pid_file="$lock_dir/pid"

  if [ ! -f "$pid_file" ]; then
    return 0
  fi

  owner_pid="$(cat "$pid_file")"

  if [ -z "$owner_pid" ]; then
    return 0
  fi

  if kill -0 "$owner_pid" 2>/dev/null; then
    return 1
  fi

  return 0
}

print_lock_details() {
  local lock_dir="$1"
  local pid_value script_value started_at_value cwd_value

  pid_value="$(read_lock_value "$lock_dir/pid")"
  script_value="$(read_lock_value "$lock_dir/script")"
  started_at_value="$(read_lock_value "$lock_dir/started_at")"
  cwd_value="$(read_lock_value "$lock_dir/cwd")"

  printf 'Lock details:\n' >&2
  printf -- '- pid: %s\n' "${pid_value:-unknown}" >&2
  printf -- '- script: %s\n' "${script_value:-unknown}" >&2
  printf -- '- started_at: %s\n' "${started_at_value:-unknown}" >&2
  printf -- '- cwd: %s\n' "${cwd_value:-unknown}" >&2
}

read_lock_value() {
  local file_path="$1"

  if [ -f "$file_path" ]; then
    cat "$file_path"
  fi
}
