import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';

const server = Fastify({ logger: true });
const port = Number(process.env.PORT || 4300);
const host = process.env.HOST || '0.0.0.0';
const slug = 'shopping-list';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRootDir = path.resolve(currentDir, '../..');
const dataDir = path.join(appRootDir, 'data');
const databasePath = path.join(dataDir, 'shopping-list.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS applied_operations (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    type TEXT NOT NULL,
    client_timestamp TEXT NOT NULL,
    device_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

setMetaValue('serverVersion', getMetaValue('serverVersion') ?? '0');

const readItemStatement = db.prepare(`
  SELECT id, text, completed, created_at, updated_at, deleted_at
  FROM items
  WHERE id = ?
`);

const readVisibleItemsStatement = db.prepare(`
  SELECT id, text, completed, created_at, updated_at, deleted_at
  FROM items
  WHERE deleted_at IS NULL
  ORDER BY completed ASC, updated_at DESC, text ASC
`);

const insertItemStatement = db.prepare(`
  INSERT INTO items (id, text, completed, created_at, updated_at, deleted_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const updateItemStatement = db.prepare(`
  UPDATE items
  SET text = ?, completed = ?, updated_at = ?, deleted_at = ?
  WHERE id = ?
`);

const insertAppliedOperationStatement = db.prepare(`
  INSERT INTO applied_operations (id, entity_id, type, client_timestamp, device_id)
  VALUES (?, ?, ?, ?, ?)
`);

const readAppliedOperationStatement = db.prepare(`
  SELECT id
  FROM applied_operations
  WHERE id = ?
`);

server.get(`/api/${slug}/health/`, async () => ({
  ok: true,
  app: slug,
  databasePath,
  serverVersion: getServerVersion()
}));

server.post(`/api/${slug}/sync/`, async (request, reply) => {
  const body = request.body;

  if (!isValidSyncBody(body)) {
    reply.code(400);
    return {
      error: 'invalid_sync_request'
    };
  }

  const ackedOperationIds = [];
  const rejectedOperations = [];

  db.exec('BEGIN');

  try {
    for (const operation of body.operations) {
      if (!isValidOperation(operation)) {
        rejectedOperations.push({
          id: typeof operation?.id === 'string' ? operation.id : 'unknown',
          reason: 'invalid_operation'
        });
        continue;
      }

      if (readAppliedOperationStatement.get(operation.id)) {
        ackedOperationIds.push(operation.id);
        continue;
      }

      const rejectionReason = applyOperation(operation);

      if (rejectionReason) {
        rejectedOperations.push({ id: operation.id, reason: rejectionReason });
        continue;
      }

      insertAppliedOperationStatement.run(
        operation.id,
        operation.entityId,
        operation.type,
        operation.clientTimestamp,
        operation.deviceId
      );

      incrementServerVersion();
      ackedOperationIds.push(operation.id);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    schemaVersion: 1,
    serverVersion: getServerVersion(),
    ackedOperationIds,
    rejectedOperations,
    state: {
      items: listVisibleItems()
    },
    serverTimestamp: new Date().toISOString()
  };
});

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}

function applyOperation(operation) {
  if (operation.type === 'item_add') {
    const text = typeof operation.payload?.text === 'string' ? operation.payload.text.trim() : '';

    if (!text) {
      return 'invalid_payload';
    }

    const existing = readItem(operation.entityId);

    if (!existing) {
      insertItemStatement.run(
        operation.entityId,
        text,
        0,
        operation.clientTimestamp,
        operation.clientTimestamp,
        null
      );
      return null;
    }

    if (operation.clientTimestamp < existing.updatedAt) {
      return null;
    }

    updateItemStatement.run(text, 0, operation.clientTimestamp, null, operation.entityId);
    return null;
  }

  if (operation.type === 'item_toggle') {
    const existing = readItem(operation.entityId);

    if (!existing) {
      return 'missing_entity';
    }

    if (operation.clientTimestamp < existing.updatedAt) {
      return null;
    }

    updateItemStatement.run(
      existing.text,
      operation.payload?.completed ? 1 : 0,
      operation.clientTimestamp,
      null,
      operation.entityId
    );
    return null;
  }

  if (operation.type === 'item_delete') {
    const existing = readItem(operation.entityId);

    if (!existing) {
      insertItemStatement.run(
        operation.entityId,
        '',
        0,
        operation.clientTimestamp,
        operation.clientTimestamp,
        operation.clientTimestamp
      );
      return null;
    }

    if (operation.clientTimestamp < existing.updatedAt) {
      return null;
    }

    updateItemStatement.run(
      existing.text,
      existing.completed ? 1 : 0,
      operation.clientTimestamp,
      operation.clientTimestamp,
      operation.entityId
    );
    return null;
  }

  return 'unsupported_operation';
}

function listVisibleItems() {
  return readVisibleItemsStatement.all().map(mapItemRow);
}

function readItem(id) {
  const row = readItemStatement.get(id);
  return row ? mapItemRow(row) : null;
}

function mapItemRow(row) {
  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null
  };
}

function getServerVersion() {
  return Number(getMetaValue('serverVersion') ?? '0');
}

function incrementServerVersion() {
  setMetaValue('serverVersion', String(getServerVersion() + 1));
}

function getMetaValue(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row?.value ?? null;
}

function setMetaValue(key, value) {
  db.prepare(`
    INSERT INTO meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function isValidSyncBody(body) {
  return Boolean(body) && typeof body === 'object' && Array.isArray(body.operations);
}

function isValidOperation(operation) {
  return Boolean(operation)
    && typeof operation === 'object'
    && typeof operation.id === 'string'
    && typeof operation.entityId === 'string'
    && typeof operation.type === 'string'
    && typeof operation.clientTimestamp === 'string'
    && typeof operation.deviceId === 'string'
    && typeof operation.payload === 'object'
    && operation.payload !== null;
}
