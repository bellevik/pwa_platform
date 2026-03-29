import assert from 'node:assert/strict';
import { prepareShoppingListBrowserEnvironment } from './test-environment.mjs';

const { baseUrl, browser } = await prepareShoppingListBrowserEnvironment();

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
