import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const rootDir = path.resolve(import.meta.dirname, '../../../..');
const composeArgs = ['compose', '-f', 'ops/docker-compose.yml'];
const baseUrl = process.env.PWA_PLATFORM_BASE_URL || 'http://127.0.0.1';

runCommand('docker', [...composeArgs, 'up', '-d']);
await waitForHttp(`${baseUrl}/shopping-list/`);
await waitForHttp(`${baseUrl}/api/shopping-list/health/`);

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    baseURL: baseUrl,
    serviceWorkers: 'allow'
  });
  const page = await context.newPage();

  const onlineItem = `Online item ${Date.now()}`;
  const offlineItem = `Offline item ${Date.now()}`;

  await page.goto('/shopping-list/', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[aria-label="New shopping list item"]');

  await page.fill('input[aria-label="New shopping list item"]', onlineItem);
  await page.click('button[type="submit"]');
  await page.waitForSelector(`text=${onlineItem}`);

  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Offline');
  await page.waitForSelector(`text=${onlineItem}`);

  await page.fill('input[aria-label="New shopping list item"]', offlineItem);
  await page.click('button[type="submit"]');
  await page.waitForSelector(`text=${offlineItem}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Offline');
  await page.waitForSelector(`text=${offlineItem}`);

  await context.setOffline(false);
  await page.waitForSelector('text=Online');
  await page.click('text=Sync now');
  await page.waitForTimeout(1500);
  await page.click('text=Refresh from server');
  await page.waitForTimeout(1000);
  await page.waitForSelector(`text=${offlineItem}`);

  const pendingText = await page.locator('.debug-grid div').nth(0).locator('strong').textContent();
  assert.equal(pendingText?.trim(), '0');

  await context.close();
} finally {
  await browser.close();
}

process.stdout.write('Offline browser validation passed for shopping-list.\n');

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

async function waitForHttp(url) {
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
