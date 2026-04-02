#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/robot-tower-defense-frontend build
pnpm --filter @pwa-platform/robot-tower-defense-frontend test

if [ "false" = "true" ]; then
  pnpm --filter @pwa-platform/robot-tower-defense-backend test
fi

printf 'TEST completed for robot-tower-defense.\n'
