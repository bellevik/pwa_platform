#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"

bash "$ROOT_DIR/scripts/RESTART_APP.sh" robot-tower-defense

printf 'RESTART completed for robot-tower-defense.\n'
