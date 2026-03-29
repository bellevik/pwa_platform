import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const rootDir = path.resolve(import.meta.dirname, '../../../..');
const composeArgs = ['compose', '-f', 'ops/docker-compose.yml'];
const baseUrl = process.env.PWA_PLATFORM_BASE_URL || 'http://127.0.0.1';
const sqliteBasePath = path.join(rootDir, 'apps', 'shopping-list', 'data', 'shopping-list.sqlite');

export async function prepareShoppingListBrowserEnvironment() {
  runCommand('docker', [...composeArgs, 'down']);
  await resetShoppingListData();
  runCommand('docker', [...composeArgs, 'up', '-d', '--force-recreate']);
  await waitForHttp(`${baseUrl}/shopping-list/`);
  await waitForHttp(`${baseUrl}/api/shopping-list/health/`);

  return {
    baseUrl,
    browser: await chromium.launch({ headless: true })
  };
}

export async function resetShoppingListData() {
  const suffixes = ['', '-shm', '-wal'];
  await Promise.all(
    suffixes.map((suffix) => fs.rm(`${sqliteBasePath}${suffix}`, { force: true }))
  );
}

export async function waitForHttp(url) {
  const startedAt = Date.now();
  const timeoutMs = 60000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

export { baseUrl };
