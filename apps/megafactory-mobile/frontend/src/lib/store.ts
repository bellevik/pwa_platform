import Dexie, { Table } from 'dexie';
import {
  buildSyncRequest,
  getPersistentSession,
  reconcileSyncOperations,
  sortOperationsByTimestamp
} from '@pwa-platform/offline';
import { createInitialWorld, normalizeWorldState } from '../game/engine';
import type {
  BackupBootstrapResponse,
  BackupStateResponse,
  MegafactoryOperation,
  MegafactorySnapshot,
  MegafactoryState,
  MegafactorySyncRequest,
  MegafactorySyncResponse
} from '../game/types';

type AppMeta = {
  key: string;
  value: string;
};

type StoredWorld = {
  id: 'current';
  state: MegafactoryState;
};

class MegafactoryDatabase extends Dexie {
  world!: Table<StoredWorld, string>;
  operations!: Table<MegafactoryOperation, string>;
  meta!: Table<AppMeta, string>;

  constructor() {
    super('megafactory-mobile-db');

    this.version(1).stores({
      world: '&id',
      operations: '&id, clientTimestamp, status',
      meta: '&key'
    });
  }
}

const db = new MegafactoryDatabase();
const META_LAST_SYNC = 'lastSyncAt';
const META_SERVER_VERSION = 'serverVersion';
const SESSION_STORAGE_KEY = 'megafactory-mobile.session';
const APP_SLUG = 'megafactory-mobile';

export async function getSnapshot(): Promise<MegafactorySnapshot> {
  const [storedWorld, operations, lastSyncAt, serverVersion] = await Promise.all([
    db.world.get('current'),
    db.operations.toArray(),
    getMeta(META_LAST_SYNC),
    getMeta(META_SERVER_VERSION)
  ]);

  if (!storedWorld) {
    const world = createInitialWorld();
    await saveWorld(world);
    return {
      world,
      pendingCount: 0,
      failedCount: 0,
      failedOperations: [],
      lastSyncAt,
      serverVersion: Number(serverVersion ?? '0')
    };
  }

  const failedOperations = sortOperationsByTimestamp(
    operations.filter((operation) => operation.status === 'failed')
  );

  return {
    world: normalizeWorldState(storedWorld.state),
    pendingCount: operations.filter((operation) => operation.status === 'pending').length,
    failedCount: failedOperations.length,
    failedOperations,
    lastSyncAt,
    serverVersion: Number(serverVersion ?? '0')
  };
}

export async function saveWorld(world: MegafactoryState): Promise<void> {
  await db.world.put({ id: 'current', state: normalizeWorldState(world) });
}

export async function queueLocalChange(world: MegafactoryState, operation: MegafactoryOperation): Promise<void> {
  const session = getSession();

  await db.transaction('rw', db.world, db.operations, async () => {
    await db.world.put({
      id: 'current',
      state: normalizeWorldState(world)
    });
    await db.operations.put({
      ...operation,
      deviceId: session.deviceId
    });
  });
}

export async function queueLocalChanges(world: MegafactoryState, operations: MegafactoryOperation[]): Promise<void> {
  const session = getSession();

  await db.transaction('rw', db.world, db.operations, async () => {
    await db.world.put({
      id: 'current',
      state: normalizeWorldState(world)
    });

    if (operations.length === 0) {
      return;
    }

    await db.operations.bulkPut(
      operations.map((operation) => ({
        ...operation,
        deviceId: session.deviceId
      }))
    );
  });
}

export async function retryFailedOperations(): Promise<void> {
  const operations = await db.operations.toArray();

  await Promise.all(
    operations
      .filter((operation) => operation.status === 'failed')
      .map((operation) => db.operations.put({ ...operation, status: 'pending', error: undefined }))
  );
}

export async function enableCloudBackup(world: MegafactoryState): Promise<void> {
  const session = getSession();
  const response = await fetch(`/api/${APP_SLUG}/backup/enable/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      clientId: session.clientId,
      deviceId: session.deviceId,
      stateUpdatedAt: world.updatedAt,
      state: world
    })
  });

  if (!response.ok) {
    throw new Error(`Backup bootstrap failed with ${response.status}`);
  }

  const payload = (await response.json()) as BackupBootstrapResponse;
  const nextWorld: MegafactoryState = {
    ...normalizeWorldState(payload.state.world),
    profile: {
      ...payload.state.world.profile,
      cloudEnabled: true,
      recoveryCode: payload.recoveryCode
    }
  };

  await db.transaction('rw', db.world, db.meta, async () => {
    await db.world.put({ id: 'current', state: nextWorld });
    await setMeta(META_LAST_SYNC, payload.serverTimestamp);
    await setMeta(META_SERVER_VERSION, String(payload.serverVersion));
  });
}

export async function restoreFromRecoveryCode(recoveryCode: string): Promise<void> {
  const response = await fetch(`/api/${APP_SLUG}/state/?recoveryCode=${encodeURIComponent(recoveryCode)}`);

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Backup code not found.' : `Restore failed with ${response.status}`);
  }

  const payload = (await response.json()) as BackupStateResponse;
  const nextWorld: MegafactoryState = {
    ...normalizeWorldState(payload.state.world),
    profile: {
      ...payload.state.world.profile,
      cloudEnabled: true,
      recoveryCode: payload.state.recoveryCode
    }
  };

  await db.transaction('rw', db.world, db.operations, db.meta, async () => {
    await db.world.put({ id: 'current', state: nextWorld });
    await db.operations.clear();
    await setMeta(META_LAST_SYNC, payload.serverTimestamp);
    await setMeta(META_SERVER_VERSION, String(payload.serverVersion));
  });
}

export async function syncWorld(world: MegafactoryState): Promise<{ sentOperations: number }> {
  const recoveryCode = world.profile.recoveryCode;

  if (!recoveryCode) {
    throw new Error('Enable cloud backup before syncing this factory.');
  }

  const session = getSession();
  const operations = await db.operations.toArray();
  const pendingOperations = sortOperationsByTimestamp(
    operations.filter((operation) => operation.status === 'pending')
  );

  const requestBody: MegafactorySyncRequest = {
    ...buildSyncRequest({
      clientId: session.clientId,
      deviceId: session.deviceId,
      lastKnownServerVersion: Number((await getMeta(META_SERVER_VERSION)) ?? '0'),
      operations: pendingOperations
    }),
    recoveryCode,
    stateUpdatedAt: world.updatedAt,
    state: world
  };

  const response = await fetch(`/api/${APP_SLUG}/sync/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Backup code no longer exists.' : `Sync failed with ${response.status}`);
  }

  const payload = (await response.json()) as MegafactorySyncResponse;
  await applySyncResponse(payload);

  return {
    sentOperations: pendingOperations.length
  };
}

async function applySyncResponse(payload: MegafactorySyncResponse): Promise<void> {
  await db.transaction('rw', db.world, db.operations, db.meta, async () => {
    const liveOperations = await db.operations.toArray();
    const remainingOperations = reconcileSyncOperations({
      operations: liveOperations,
      ackedOperationIds: payload.ackedOperationIds,
      rejectedOperations: payload.rejectedOperations
    });
    const nextWorld: MegafactoryState = {
      ...normalizeWorldState(payload.state.world),
      profile: {
        ...payload.state.world.profile,
        cloudEnabled: true,
        recoveryCode: payload.state.recoveryCode
      }
    };

    await db.world.put({ id: 'current', state: nextWorld });
    await db.operations.clear();

    if (remainingOperations.length > 0) {
      await db.operations.bulkPut(remainingOperations);
    }

    await setMeta(META_LAST_SYNC, payload.serverTimestamp);
    await setMeta(META_SERVER_VERSION, String(payload.serverVersion));
  });
}

function getSession() {
  return getPersistentSession(SESSION_STORAGE_KEY);
}

async function getMeta(key: string): Promise<string | null> {
  return (await db.meta.get(key))?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}
