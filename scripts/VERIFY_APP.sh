#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  printf 'Usage: %s <slug>\n' "$0" >&2
  exit 1
fi

node scripts/verify-app.mjs "$1"
