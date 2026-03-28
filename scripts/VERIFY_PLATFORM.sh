#!/usr/bin/env bash
set -euo pipefail

printf 'Generating app registry...\n'
bash scripts/REGISTER_APPS.sh

printf 'Building shell...\n'
pnpm --filter @pwa-platform/shell build >/dev/null

printf 'Verifying registry and shell artifacts...\n'
node scripts/verify-platform.mjs
