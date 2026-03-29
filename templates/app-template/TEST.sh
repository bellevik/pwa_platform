#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/__APP_SLUG__-frontend build
pnpm --filter @pwa-platform/__APP_SLUG__-frontend test

if [ "__HAS_BACKEND__" = "true" ]; then
  pnpm --filter @pwa-platform/__APP_SLUG__-backend test
fi

printf 'TEST completed for __APP_SLUG__.\n'
