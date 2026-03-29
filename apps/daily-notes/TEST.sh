#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/daily-notes-frontend build
pnpm --filter @pwa-platform/daily-notes-frontend test

if [ "false" = "true" ]; then
  pnpm --filter @pwa-platform/daily-notes-backend test
fi

printf 'TEST completed for daily-notes.\n'
