#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"

acquire_platform_lock

node scripts/register-apps.mjs
