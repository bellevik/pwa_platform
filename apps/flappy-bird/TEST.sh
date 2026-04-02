#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/flappy-bird-frontend build
pnpm --filter @pwa-platform/flappy-bird-frontend test

if [ "false" = "true" ]; then
  pnpm --filter @pwa-platform/flappy-bird-backend test
fi

printf 'TEST completed for flappy-bird.\n'
