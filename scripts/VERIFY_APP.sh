#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_base_tooling

if [ "$#" -ne 1 ]; then
  printf 'Usage: %s <slug>\n' "$0" >&2
  exit 1
fi

node scripts/verify-app.mjs "$1"
