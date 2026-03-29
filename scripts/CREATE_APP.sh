#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

node "$ROOT_DIR/scripts/create-app.mjs" "$@"

if [ "${PWA_PLATFORM_SKIP_INSTALL:-0}" = "1" ]; then
  printf 'Skipping workspace install after app creation because PWA_PLATFORM_SKIP_INSTALL=1.\n'
else
  printf 'Refreshing workspace dependencies for the new app...\n'
  pnpm install
fi
