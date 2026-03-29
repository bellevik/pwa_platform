#!/usr/bin/env bash
set -euo pipefail

print_operation_banner() {
  local label="$1"
  printf '=== %s ===\n' "$label"
}

print_active_flag_summary() {
  printf 'Active flags:'
  printf ' SKIP_INSTALL=%s' "${PWA_PLATFORM_SKIP_INSTALL:-0}"
  printf ' SKIP_BUILD=%s' "${PWA_PLATFORM_SKIP_BUILD:-0}"
  printf ' SKIP_APP_VERIFY=%s' "${PWA_PLATFORM_SKIP_APP_VERIFY:-0}"
  printf ' DRY_RUN=%s' "${PWA_PLATFORM_DRY_RUN:-0}"
  printf ' LOCK_TIMEOUT=%s\n' "${PWA_PLATFORM_LOCK_TIMEOUT:-30}"
}
