#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/shopping-list-frontend build
pnpm --filter @pwa-platform/shopping-list-frontend test
pnpm --filter @pwa-platform/shopping-list-backend test
node apps/shopping-list/frontend/scripts/offline-browser-check.mjs
node apps/shopping-list/frontend/scripts/multi-device-browser-check.mjs
