#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"

bash "$ROOT_DIR/scripts/RESTART_APP.sh" calculator

printf 'RESTART completed for calculator.\n'
