#!/usr/bin/env bash
set -euo pipefail

repo_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  printf '%s\n' "$script_dir"
}

app_dir() {
  local slug="$1"
  printf '%s/apps/%s\n' "$(repo_root)" "$slug"
}

app_config_path() {
  local slug="$1"
  printf '%s/app.config.json\n' "$(app_dir "$slug")"
}

require_app_slug() {
  if [ "$#" -ne 1 ]; then
    printf 'Usage: %s <slug>\n' "$0" >&2
    exit 1
  fi
}

ensure_app_exists() {
  local slug="$1"
  if [ ! -f "$(app_config_path "$slug")" ]; then
    printf 'Unknown app slug: %s\n' "$slug" >&2
    exit 1
  fi
}

json_field() {
  local file_path="$1"
  local field_name="$2"
  python3 - "$file_path" "$field_name" <<'PY'
import json
import sys

file_path = sys.argv[1]
field_name = sys.argv[2]

with open(file_path, 'r', encoding='utf-8') as handle:
    data = json.load(handle)

value = data[field_name]
if isinstance(value, bool):
    print('true' if value else 'false')
else:
    print(value)
PY
}

app_has_backend() {
  local slug="$1"
  json_field "$(app_config_path "$slug")" "hasBackend"
}

app_has_database() {
  local slug="$1"
  json_field "$(app_config_path "$slug")" "hasDatabase"
}

app_frontend_package() {
  local slug="$1"
  printf '@pwa-platform/%s-frontend\n' "$slug"
}

app_backend_package() {
  local slug="$1"
  printf '@pwa-platform/%s-backend\n' "$slug"
}

app_backend_service() {
  local slug="$1"
  printf '%s-backend\n' "$slug"
}

list_app_slugs() {
  python3 - <<'PY'
import pathlib

apps_dir = pathlib.Path.cwd() / 'apps'
if not apps_dir.exists():
    raise SystemExit(0)

for entry in sorted(apps_dir.iterdir()):
    if entry.is_dir() and (entry / 'app.config.json').exists():
        print(entry.name)
PY
}
