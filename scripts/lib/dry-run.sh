#!/usr/bin/env bash
set -euo pipefail

is_dry_run() {
  [ "${PWA_PLATFORM_DRY_RUN:-0}" = "1" ]
}

run_cmd() {
  if is_dry_run; then
    printf '[dry-run]'
    for arg in "$@"; do
      printf ' %q' "$arg"
    done
    printf '\n'
    return 0
  fi

  "$@"
}

run_bash_script() {
  run_cmd bash "$@"
}
