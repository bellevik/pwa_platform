import assert from 'node:assert/strict';
import { baseUrl, prepareShoppingListBrowserEnvironment } from './test-environment.mjs';

const { browser } = await prepareShoppingListBrowserEnvironment();
const itemName = `Shared item ${Date.now()}`;

try {
  await seedCanonicalItem(itemName);

  const deviceA = await browser.newContext({
    baseURL: baseUrl,
    serviceWorkers: 'allow'
  });
  const deviceB = await browser.newContext({
    baseURL: baseUrl,
    serviceWorkers: 'allow'
  });

  const pageA = await deviceA.newPage();
  const pageB = await deviceB.newPage();

  await pageA.goto('/shopping-list/', { waitUntil: 'networkidle' });
  await pageB.goto('/shopping-list/', { waitUntil: 'networkidle' });

  await pageA.waitForSelector('input[aria-label="New shopping list item"]');
  await pageB.waitForSelector('input[aria-label="New shopping list item"]');

  await pageA.waitForSelector(`text=${itemName}`);
  await pageB.click('text=Refresh from server');
  await pageB.waitForSelector(`text=${itemName}`);

  await applyCanonicalToggle(itemName, true);
  await pageB.click('text=Refresh from server');
  await pageB.waitForTimeout(400);

  const itemCardA = pageA.locator('.item-card').filter({ hasText: itemName });
  await refreshUntilItemDone(pageA, itemCardA);
  const itemCardB = pageB.locator('.item-card').filter({ hasText: itemName });
  await refreshUntilItemDone(pageB, itemCardB);

  await expectText(pageA.locator('.debug-grid div').nth(0).locator('strong'), '0');
  await expectText(pageB.locator('.debug-grid div').nth(0).locator('strong'), '0');

  const itemClassA = await itemCardA.getAttribute('class');
  const itemClassB = await itemCardB.getAttribute('class');
  assert.ok(itemClassA?.includes('item-card--done'), 'Expected device A to reflect the completed canonical state');
  assert.ok(itemClassB?.includes('item-card--done'), 'Expected device B to reflect the completed canonical state');

  await deviceA.close();
  await deviceB.close();
} finally {
  await browser.close();
}

process.stdout.write('Multi-device browser validation passed for shopping-list.\n');

async function expectText(locator, expected) {
  const value = await locator.textContent();
  assert.equal(value?.trim(), expected);
}

async function seedCanonicalItem(itemName) {
  const response = await fetch(`${baseUrl}/api/shopping-list/sync/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      schemaVersion: 1,
      clientId: '01010101-0101-4101-8101-010101010101',
      deviceId: '02020202-0202-4202-8202-020202020202',
      lastKnownServerVersion: 0,
      operations: [
        {
          id: crypto.randomUUID(),
          entityId: crypto.randomUUID(),
          type: 'item_add',
          payload: { text: itemName },
          clientTimestamp: new Date().toISOString(),
          deviceId: '02020202-0202-4202-8202-020202020202',
          status: 'pending'
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to seed canonical shopping-list item: ${response.status}`);
  }
}

async function applyCanonicalToggle(itemName, completed) {
  const stateResponse = await fetch(`${baseUrl}/api/shopping-list/state/`);
  if (!stateResponse.ok) {
    throw new Error(`Failed to load canonical shopping-list state: ${stateResponse.status}`);
  }

  const statePayload = await stateResponse.json();
  const item = statePayload.state.items.find((entry) => entry.text === itemName);

  if (!item) {
    throw new Error('Failed to locate seeded canonical item for multi-device validation');
  }

  const response = await fetch(`${baseUrl}/api/shopping-list/sync/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      schemaVersion: 1,
      clientId: '03030303-0303-4303-8303-030303030303',
      deviceId: '04040404-0404-4404-8404-040404040404',
      lastKnownServerVersion: statePayload.serverVersion,
      operations: [
        {
          id: crypto.randomUUID(),
          entityId: item.id,
          type: 'item_toggle',
          payload: { completed },
          clientTimestamp: new Date().toISOString(),
          deviceId: '04040404-0404-4404-8404-040404040404',
          status: 'pending'
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to apply canonical toggle for multi-device validation: ${response.status}`);
  }

  if (!(await hasCanonicalItemState(itemName, completed))) {
    throw new Error('Canonical state did not reflect the multi-device toggle operation');
  }
}

async function hasCanonicalItemState(itemName, completed) {
  const response = await fetch(`${baseUrl}/api/shopping-list/state/`);
  if (!response.ok) {
    return false;
  }

  const payload = await response.json();
  const item = payload.state.items.find((entry) => entry.text === itemName);
  return Boolean(item) && Boolean(item.completed) === completed;
}

async function refreshUntilItemDone(page, itemCard) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 10000) {
    await page.click('text=Refresh from server');
    await page.waitForTimeout(400);

    const className = await itemCard.getAttribute('class');
    if (className?.includes('item-card--done')) {
      return;
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await itemCard.waitFor();
  }

  throw new Error('Timed out waiting for device A to reflect the canonical completed state');
}
