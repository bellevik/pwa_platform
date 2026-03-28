#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @pwa-platform/shopping-list-frontend build
pnpm --filter @pwa-platform/shopping-list-backend test
