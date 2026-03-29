#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

compose_file_path() {
  printf '%s/ops/docker-compose.yml\n' "$(repo_root)"
}

wait_for_http_ok() {
  local url="$1"
  local timeout_seconds="${2:-60}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    if [ $(( $(date +%s) - started_at )) -ge "$timeout_seconds" ]; then
      printf 'Timed out waiting for %s\n' "$url" >&2
      return 1
    fi

    sleep 1
  done
}

wait_for_service_running() {
  local service_name="$1"
  local timeout_seconds="${2:-60}"
  local compose_file
  local started_at

  compose_file="$(compose_file_path)"
  started_at="$(date +%s)"

  while true; do
    if docker compose -f "$compose_file" ps --status running --services 2>/dev/null | grep -qx "$service_name"; then
      return 0
    fi

    if [ $(( $(date +%s) - started_at )) -ge "$timeout_seconds" ]; then
      printf 'Timed out waiting for service %s to be running\n' "$service_name" >&2
      return 1
    fi

    sleep 1
  done
}

assert_no_running_services() {
  local compose_file
  local running_services

  compose_file="$(compose_file_path)"
  running_services="$(docker compose -f "$compose_file" ps --status running --services 2>/dev/null || true)"

  if [ -n "$running_services" ]; then
    printf 'Expected no running services, but found:\n%s\n' "$running_services" >&2
    return 1
  fi
}

wait_for_platform_runtime() {
  local timeout_seconds="${1:-60}"

  wait_for_service_running caddy "$timeout_seconds"
  wait_for_service_running shopping-list-backend "$timeout_seconds"
  wait_for_http_ok "http://127.0.0.1/" "$timeout_seconds"
  wait_for_http_ok "http://127.0.0.1/generated/app-registry.json" "$timeout_seconds"
  wait_for_http_ok "http://127.0.0.1/api/shopping-list/health/" "$timeout_seconds"
}
