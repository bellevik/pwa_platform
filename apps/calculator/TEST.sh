#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/calculator-frontend build
pnpm --filter @pwa-platform/calculator-frontend test

if [ "false" = "true" ]; then
  pnpm --filter @pwa-platform/calculator-backend test
fi

printf 'TEST completed for calculator.\n'
