#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/dry-run.sh"
source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"
source "$(dirname "$0")/lib/runtime.sh"

acquire_platform_lock
require_base_tooling
require_runtime_tooling
print_operation_banner "VERIFY_GENERATED_APP_FLOW"
print_active_flag_summary

ROOT_DIR="$(repo_root)"
APP_SLUG="${1:-phase-eleven-notes-$PPID}"
APP_NAME="Phase Eleven Notes"
APP_DESCRIPTION="Temporary generated app used to verify the full create-register-route workflow"
APP_DIR="$ROOT_DIR/apps/$APP_SLUG"
cleanup_needed=0

cleanup() {
  if [ "$cleanup_needed" != "1" ]; then
    return 0
  fi

  printf 'Cleaning up generated verification app: %s\n' "$APP_SLUG"

  if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
  fi

  if [ "${PWA_PLATFORM_DRY_RUN:-0}" = "1" ]; then
    printf 'Skipping cleanup install/registry rebuild because PWA_PLATFORM_DRY_RUN=1.\n'
    return 0
  fi

  pnpm install
  bash "$ROOT_DIR/scripts/REGISTER_APPS.sh"
}

trap cleanup EXIT

if [ -e "$APP_DIR" ]; then
  printf 'Verification app already exists: %s\n' "$APP_SLUG" >&2
  exit 1
fi

run_bash_script "$ROOT_DIR/scripts/CREATE_APP.sh" "$APP_SLUG" --name "$APP_NAME" --description "$APP_DESCRIPTION"
cleanup_needed=1

run_bash_script "$ROOT_DIR/scripts/TEST_APP.sh" "$APP_SLUG"
run_bash_script "$ROOT_DIR/scripts/REGISTER_APPS.sh"

PWA_PLATFORM_SKIP_INSTALL=1 run_bash_script "$ROOT_DIR/scripts/BUILD_ALL.sh"
PWA_PLATFORM_SKIP_BUILD=1 run_bash_script "$ROOT_DIR/scripts/START_ALL.sh"

if is_dry_run; then
  printf 'Skipping browser workflow verification because PWA_PLATFORM_DRY_RUN=1.\n'
  exit 0
fi

wait_for_http_ok "http://127.0.0.1/$APP_SLUG/" 60

APP_SLUG="$APP_SLUG" APP_NAME="$APP_NAME" pnpm --filter @pwa-platform/shopping-list-frontend exec node --input-type=module -e "import { chromium } from 'playwright'; const slug = process.env.APP_SLUG; const name = process.env.APP_NAME; const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ baseURL: 'http://127.0.0.1' }); await page.goto('/', { waitUntil: 'networkidle' }); await page.waitForSelector('text=' + name); await page.click('text=' + name); await page.waitForURL('**/' + slug + '/'); await page.waitForSelector('text=Template app scaffold'); console.log('Generated app shell discovery passed for ' + slug + '.'); await browser.close();"

printf 'VERIFY_GENERATED_APP_FLOW completed successfully for %s.\n' "$APP_SLUG"
