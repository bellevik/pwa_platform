import Dexie, { Table } from 'dexie';
import {
  buildSyncRequest,
  getPersistentSession,
  reconcileSyncOperations,
  sortOperationsByTimestamp
} from '@pwa-platform/offline';
import type {
  ShoppingListDebugInfo,
  ShoppingItem,
  ShoppingListSnapshot,
  ShoppingOperation,
  SyncRequestBody,
  SyncResponseBody
} from '../types';
import { rebuildItemsFromCanonicalState } from './item-replay';

type AppMeta = {
  key: string;
  value: string;
};

type SyncResult = {
  sentOperations: number;
};

type CanonicalStateResponse = {
  schemaVersion: number;
  serverVersion: number;
  state: {
    items: ShoppingItem[];
  };
  serverTimestamp: string;
};

class ShoppingListDatabase extends Dexie {
  items!: Table<ShoppingItem, string>;
  operations!: Table<ShoppingOperation, string>;
  meta!: Table<AppMeta, string>;

  constructor() {
    super('shopping-list-db');

    this.version(1).stores({
      items: '&id, updatedAt, deletedAt, completed',
      operations: '&id, clientTimestamp, status',
      meta: '&key'
    });
  }
}

const db = new ShoppingListDatabase();
const DATABASE_NAME = 'shopping-list-db';
const META_LAST_SYNC = 'lastSyncAt';
const META_SERVER_VERSION = 'serverVersion';
const SESSION_STORAGE_KEY = 'shopping-list.session';

export async function getSnapshot(): Promise<ShoppingListSnapshot> {
  const [items, operations, lastSyncAt, serverVersion] = await Promise.all([
    db.items.toArray(),
    db.operations.toArray(),
    getMeta(META_LAST_SYNC),
    getMeta(META_SERVER_VERSION)
  ]);

  const visibleItems = items
    .filter((item) => !item.deletedAt)
    .sort((left, right) => {
      if (left.completed !== right.completed) {
        return Number(left.completed) - Number(right.completed);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });

  return {
    items: visibleItems,
    pendingCount: operations.filter((operation) => operation.status === 'pending').length,
    failedCount: operations.filter((operation) => operation.status === 'failed').length,
    failedOperations: sortOperationsByTimestamp(
      operations.filter((operation) => operation.status === 'failed')
    ),
    lastSyncAt,
    serverVersion: Number(serverVersion ?? '0')
  };
}

export function getSyncDebugInfo(): ShoppingListDebugInfo {
  const session = getSession();

  return {
    clientId: session.clientId,
    deviceId: session.deviceId,
    storageKey: SESSION_STORAGE_KEY,
    databaseName: DATABASE_NAME
  };
}

export async function addItem(text: string): Promise<void> {
  const session = getSession();
  const timestamp = new Date().toISOString();
  const item: ShoppingItem = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };

  const operation = createOperation(session.deviceId, item.id, 'item_add', {
    text: item.text
  }, timestamp);

  await db.transaction('rw', db.items, db.operations, async () => {
    await db.items.put(item);
    await db.operations.put(operation);
  });
}

export async function toggleItem(id: string): Promise<void> {
  const item = await db.items.get(id);

  if (!item || item.deletedAt) {
    return;
  }

  const session = getSession();
  const timestamp = new Date().toISOString();
  const nextCompleted = !item.completed;
  const operation = createOperation(session.deviceId, item.id, 'item_toggle', {
    completed: nextCompleted
  }, timestamp);

  await db.transaction('rw', db.items, db.operations, async () => {
    await db.items.put({
      ...item,
      completed: nextCompleted,
      updatedAt: timestamp
    });
    await db.operations.put(operation);
  });
}

export async function deleteItem(id: string): Promise<void> {
  const item = await db.items.get(id);

  if (!item || item.deletedAt) {
    return;
  }

  const session = getSession();
  const timestamp = new Date().toISOString();
  const operation = createOperation(session.deviceId, item.id, 'item_delete', {}, timestamp);

  await db.transaction('rw', db.items, db.operations, async () => {
    await db.items.put({
      ...item,
      deletedAt: timestamp,
      updatedAt: timestamp
    });
    await db.operations.put(operation);
  });
}

export async function retryFailedOperations(): Promise<void> {
  const failedOperations = await db.operations.toArray();

  await Promise.all(
    failedOperations
      .filter((operation) => operation.status === 'failed')
      .map((operation) =>
        db.operations.put({
          ...operation,
          status: 'pending',
          error: undefined
        })
      )
  );
}

export async function syncItems(): Promise<SyncResult> {
  const session = getSession();
  const allOperations = await db.operations.toArray();
  const pendingOperations = sortOperationsByTimestamp(
    allOperations.filter((operation) => operation.status === 'pending')
  );

  const requestBody: SyncRequestBody = buildSyncRequest({
    clientId: session.clientId,
    deviceId: session.deviceId,
    lastKnownServerVersion: Number((await getMeta(META_SERVER_VERSION)) ?? '0'),
    operations: pendingOperations
  });

  const response = await fetch('/api/shopping-list/sync/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Sync failed with ${response.status}`);
  }

  const payload = (await response.json()) as SyncResponseBody;
  await applySyncResponse(payload);

  return {
    sentOperations: pendingOperations.length
  };
}

export async function refreshFromCanonicalState(): Promise<void> {
  const response = await fetch('/api/shopping-list/state/', {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`State refresh failed with ${response.status}`);
  }

  const payload = (await response.json()) as CanonicalStateResponse;

  await db.transaction('rw', db.items, db.operations, db.meta, async () => {
    const liveOperations = await db.operations.toArray();
    const nextItems = rebuildItemsFromCanonicalState({
      canonicalItems: payload.state.items,
      operations: liveOperations
    });

    await db.items.clear();

    if (nextItems.length > 0) {
      await db.items.bulkPut(nextItems);
    }

    await setMeta(META_LAST_SYNC, payload.serverTimestamp);
    await setMeta(META_SERVER_VERSION, String(payload.serverVersion));
  });
}

async function applySyncResponse(payload: SyncResponseBody): Promise<void> {
  await db.transaction('rw', db.items, db.operations, db.meta, async () => {
    const liveOperations = await db.operations.toArray();
    const remainingOperations = reconcileSyncOperations({
      operations: liveOperations,
      ackedOperationIds: payload.ackedOperationIds,
      rejectedOperations: payload.rejectedOperations
    });
    const nextItems = rebuildItemsFromCanonicalState({
      canonicalItems: payload.state.items,
      operations: remainingOperations
    });

    await db.items.clear();

    await db.operations.clear();

    if (remainingOperations.length > 0) {
      await db.operations.bulkPut(remainingOperations);
    }

    if (nextItems.length > 0) {
      await db.items.bulkPut(nextItems);
    }

    await setMeta(META_LAST_SYNC, payload.serverTimestamp);
    await setMeta(META_SERVER_VERSION, String(payload.serverVersion));
  });
}

function createOperation(
  deviceId: string,
  entityId: string,
  type: ShoppingOperation['type'],
  payload: ShoppingOperation['payload'],
  clientTimestamp: string
): ShoppingOperation {
  return {
    id: crypto.randomUUID(),
    entityId,
    type,
    payload,
    clientTimestamp,
    deviceId,
    status: 'pending'
  };
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
