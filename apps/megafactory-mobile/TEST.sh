#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/megafactory-mobile-frontend build
pnpm --filter @pwa-platform/megafactory-mobile-frontend test

if [ "true" = "true" ]; then
  pnpm --filter @pwa-platform/megafactory-mobile-backend test
fi

printf 'TEST completed for megafactory-mobile.\n'
