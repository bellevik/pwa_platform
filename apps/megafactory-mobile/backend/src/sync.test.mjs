import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildMegafactoryServer } from './app.mjs';

const baseWorld = {
  schemaVersion: 1,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
  lastSimulatedAt: '2026-04-01T10:00:00.000Z',
  profile: {
    cash: 420,
    lifetimeCash: 420,
    totalDevicesShipped: 7,
    cloudEnabled: false,
    recoveryCode: null
  },
  activeLineId: 'line-1',
  lines: []
};

async function withServer(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'megafactory-test-'));
  const databasePath = path.join(tempDir, 'megafactory-mobile.sqlite');
  const server = buildMegafactoryServer({ databasePath, logger: false });

  try {
    await run(server);
  } finally {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('backup bootstrap generates a recovery code and stores the state', async () => {
  await withServer(async (server) => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/backup/enable/',
      payload: {
        state: baseWorld,
        stateUpdatedAt: '2026-04-01T10:00:00.000Z'
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.match(body.recoveryCode, /^MGF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.equal(body.state.world.profile.cash, 420);
  });
});

test('sync acknowledges operations and persists the latest world snapshot', async () => {
  await withServer(async (server) => {
    const bootstrap = await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/backup/enable/',
      payload: {
        state: baseWorld,
        stateUpdatedAt: '2026-04-01T10:00:00.000Z'
      }
    });

    const recoveryCode = bootstrap.json().recoveryCode;
    const nextWorld = {
      ...baseWorld,
      updatedAt: '2026-04-01T10:05:00.000Z',
      lastSimulatedAt: '2026-04-01T10:05:00.000Z',
      profile: {
        ...baseWorld.profile,
        cash: 960
      }
    };

    const sync = await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/sync/',
      payload: {
        schemaVersion: 1,
        clientId: 'client-a',
        deviceId: 'device-a',
        lastKnownServerVersion: 0,
        recoveryCode,
        stateUpdatedAt: nextWorld.updatedAt,
        state: nextWorld,
        operations: [
          {
            id: 'op-1',
            entityId: 'machine-1',
            type: 'machine_place',
            payload: { kind: 'belt' },
            clientTimestamp: nextWorld.updatedAt,
            deviceId: 'device-a',
            status: 'pending'
          }
        ]
      }
    });

    assert.equal(sync.statusCode, 200);
    const body = sync.json();
    assert.deepEqual(body.ackedOperationIds, ['op-1']);
    assert.equal(body.serverVersion, 1);
    assert.equal(body.state.world.profile.cash, 960);
  });
});

test('stale snapshots do not overwrite newer canonical state', async () => {
  await withServer(async (server) => {
    const bootstrap = await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/backup/enable/',
      payload: {
        state: baseWorld,
        stateUpdatedAt: '2026-04-01T10:00:00.000Z'
      }
    });

    const recoveryCode = bootstrap.json().recoveryCode;

    await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/sync/',
      payload: {
        schemaVersion: 1,
        clientId: 'client-a',
        deviceId: 'device-a',
        lastKnownServerVersion: 0,
        recoveryCode,
        stateUpdatedAt: '2026-04-01T11:00:00.000Z',
        state: {
          ...baseWorld,
          updatedAt: '2026-04-01T11:00:00.000Z',
          profile: {
            ...baseWorld.profile,
            cash: 2200
          }
        },
        operations: []
      }
    });

    const stale = await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/sync/',
      payload: {
        schemaVersion: 1,
        clientId: 'client-b',
        deviceId: 'device-b',
        lastKnownServerVersion: 1,
        recoveryCode,
        stateUpdatedAt: '2026-04-01T10:30:00.000Z',
        state: {
          ...baseWorld,
          updatedAt: '2026-04-01T10:30:00.000Z',
          profile: {
            ...baseWorld.profile,
            cash: 150
          }
        },
        operations: []
      }
    });

    assert.equal(stale.statusCode, 200);
    assert.equal(stale.json().state.world.profile.cash, 2200);
  });
});

test('state endpoint restores the canonical world for a recovery code', async () => {
  await withServer(async (server) => {
    const bootstrap = await server.inject({
      method: 'POST',
      url: '/api/megafactory-mobile/backup/enable/',
      payload: {
        state: baseWorld,
        stateUpdatedAt: '2026-04-01T10:00:00.000Z'
      }
    });

    const recoveryCode = bootstrap.json().recoveryCode;
    const response = await server.inject({
      method: 'GET',
      url: `/api/megafactory-mobile/state/?recoveryCode=${recoveryCode}`
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().state.recoveryCode, recoveryCode);
    assert.equal(response.json().state.world.profile.cash, 420);
  });
});
