import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildShoppingListServer } from './app.mjs';

const makeRequest = (operations, lastKnownServerVersion = 0) => ({
  schemaVersion: 1,
  clientId: '11111111-1111-4111-8111-111111111111',
  deviceId: '22222222-2222-4222-8222-222222222222',
  lastKnownServerVersion,
  operations
});

async function withServer(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shopping-list-test-'));
  const databasePath = path.join(tempDir, 'shopping-list.sqlite');
  const server = buildShoppingListServer({ databasePath, logger: false });

  try {
    await run(server);
  } finally {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('sync adds items and returns canonical state', async () => {
  await withServer(async (server) => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/shopping-list/sync/',
      payload: makeRequest([
        {
          id: '33333333-3333-4333-8333-333333333333',
          entityId: '44444444-4444-4444-8444-444444444444',
          type: 'item_add',
          payload: { text: 'Milk' },
          clientTimestamp: '2026-03-29T10:00:00.000Z',
          deviceId: '22222222-2222-4222-8222-222222222222',
          status: 'pending'
        }
      ])
    });

    assert.equal(response.statusCode, 200);

    const body = response.json();
    assert.deepEqual(body.ackedOperationIds, ['33333333-3333-4333-8333-333333333333']);
    assert.equal(body.serverVersion, 1);
    assert.equal(body.state.items.length, 1);
    assert.equal(body.state.items[0].text, 'Milk');
  });
});

test('sync handles idempotent replays without duplicating data', async () => {
  await withServer(async (server) => {
    const operation = {
      id: '55555555-5555-4555-8555-555555555555',
      entityId: '66666666-6666-4666-8666-666666666666',
      type: 'item_add',
      payload: { text: 'Bread' },
      clientTimestamp: '2026-03-29T11:00:00.000Z',
      deviceId: '22222222-2222-4222-8222-222222222222',
      status: 'pending'
    };

    const first = await server.inject({
      method: 'POST',
      url: '/api/shopping-list/sync/',
      payload: makeRequest([operation])
    });
    const second = await server.inject({
      method: 'POST',
      url: '/api/shopping-list/sync/',
      payload: makeRequest([operation], 1)
    });

    assert.equal(first.json().state.items.length, 1);
    assert.equal(second.json().state.items.length, 1);
    assert.equal(second.json().serverVersion, 1);
  });
});

test('sync supports toggle and delete operations in order', async () => {
  await withServer(async (server) => {
    const entityId = '77777777-7777-4777-8777-777777777777';

    await server.inject({
      method: 'POST',
      url: '/api/shopping-list/sync/',
      payload: makeRequest([
        {
          id: '88888888-8888-4888-8888-888888888888',
          entityId,
          type: 'item_add',
          payload: { text: 'Cheese' },
          clientTimestamp: '2026-03-29T12:00:00.000Z',
          deviceId: '22222222-2222-4222-8222-222222222222',
          status: 'pending'
        },
        {
          id: '99999999-9999-4999-8999-999999999999',
          entityId,
          type: 'item_toggle',
          payload: { completed: true },
          clientTimestamp: '2026-03-29T12:01:00.000Z',
          deviceId: '22222222-2222-4222-8222-222222222222',
          status: 'pending'
        }
      ])
    });

    const deleted = await server.inject({
      method: 'POST',
      url: '/api/shopping-list/sync/',
      payload: makeRequest([
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          entityId,
          type: 'item_delete',
          payload: {},
          clientTimestamp: '2026-03-29T12:02:00.000Z',
          deviceId: '22222222-2222-4222-8222-222222222222',
          status: 'pending'
        }
      ], 2)
    });

    assert.equal(deleted.statusCode, 200);
    assert.equal(deleted.json().state.items.length, 0);
    assert.equal(deleted.json().serverVersion, 3);
  });
});

test('sync rejects invalid payloads without mutating state', async () => {
  await withServer(async (server) => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/shopping-list/sync/',
      payload: makeRequest([
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          type: 'item_add',
          payload: { text: '   ' },
          clientTimestamp: '2026-03-29T13:00:00.000Z',
          deviceId: '22222222-2222-4222-8222-222222222222',
          status: 'pending'
        }
      ])
    });

    const body = response.json();
    assert.equal(response.statusCode, 200);
    assert.equal(body.serverVersion, 0);
    assert.equal(body.state.items.length, 0);
    assert.deepEqual(body.rejectedOperations, [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        reason: 'invalid_payload'
      }
    ]);
  });
});
