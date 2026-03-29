#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"

bash "$ROOT_DIR/scripts/RESTART_APP.sh" daily-notes

printf 'RESTART completed for daily-notes.\n'
