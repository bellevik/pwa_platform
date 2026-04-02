import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import Fastify from 'fastify';

const SLUG = 'megafactory-mobile';
const CODE_ALPHABET = '346789ABCDEFGHJKLMNPQRTUVWXY';

export function buildMegafactoryServer(options = {}) {
  const databasePath = options.databasePath ?? path.resolve('apps/megafactory-mobile/data/megafactory-mobile.sqlite');
  const logger = options.logger ?? true;

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const server = Fastify({
    logger,
    routerOptions: {
      ignoreTrailingSlash: true
    }
  });
  const db = new DatabaseSync(databasePath);

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS backup_profiles (
      recovery_code TEXT PRIMARY KEY,
      world_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      server_version INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS applied_operations (
      id TEXT PRIMARY KEY,
      recovery_code TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      type TEXT NOT NULL,
      client_timestamp TEXT NOT NULL,
      device_id TEXT NOT NULL
    );
  `);

  const readProfileStatement = db.prepare(`
    SELECT recovery_code, world_json, created_at, updated_at, server_version
    FROM backup_profiles
    WHERE recovery_code = ?
  `);

  const insertProfileStatement = db.prepare(`
    INSERT INTO backup_profiles (recovery_code, world_json, created_at, updated_at, server_version)
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateProfileStatement = db.prepare(`
    UPDATE backup_profiles
    SET world_json = ?, updated_at = ?, server_version = ?
    WHERE recovery_code = ?
  `);

  const readAppliedOperationStatement = db.prepare(`
    SELECT id
    FROM applied_operations
    WHERE id = ?
  `);

  const insertAppliedOperationStatement = db.prepare(`
    INSERT INTO applied_operations (id, recovery_code, entity_id, type, client_timestamp, device_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  server.get(`/api/${SLUG}/health/`, async () => {
    const profileCount = db.prepare('SELECT COUNT(*) AS count FROM backup_profiles').get().count;

    return {
      ok: true,
      app: SLUG,
      databasePath,
      backupProfiles: Number(profileCount)
    };
  });

  server.get(`/api/${SLUG}/state/`, async (request, reply) => {
    const recoveryCode = typeof request.query?.recoveryCode === 'string'
      ? request.query.recoveryCode.trim().toUpperCase()
      : '';

    if (!recoveryCode) {
      const timestamp = new Date().toISOString();
      return {
        schemaVersion: 1,
        serverVersion: 0,
        state: {
          world: createEmptyWorldState(timestamp),
          recoveryCode: ''
        },
        serverTimestamp: timestamp,
        requiresRecoveryCode: true
      };
    }

    const profile = readProfile(recoveryCode);

    if (!profile) {
      reply.code(404);
      return { error: 'backup_not_found' };
    }

    return buildStateResponse(profile);
  });

  server.post(`/api/${SLUG}/backup/enable/`, async (request, reply) => {
    const body = request.body;

    if (!isValidBootstrapBody(body)) {
      reply.code(400);
      return { error: 'invalid_backup_bootstrap' };
    }

    const timestamp = typeof body.stateUpdatedAt === 'string' ? body.stateUpdatedAt : new Date().toISOString();
    const recoveryCode = generateUniqueRecoveryCode();

    insertProfileStatement.run(
      recoveryCode,
      JSON.stringify(body.state),
      timestamp,
      timestamp,
      0
    );

    return {
      schemaVersion: 1,
      recoveryCode,
      serverVersion: 0,
      state: {
        world: body.state,
        recoveryCode
      },
      serverTimestamp: timestamp
    };
  });

  server.post(`/api/${SLUG}/sync/`, async (request, reply) => {
    const body = request.body;

    if (!isValidSyncBody(body)) {
      reply.code(400);
      return { error: 'invalid_sync_request' };
    }

    const recoveryCode = body.recoveryCode.trim().toUpperCase();
    const profile = readProfile(recoveryCode);

    if (!profile) {
      reply.code(404);
      return { error: 'backup_not_found' };
    }

    const ackedOperationIds = [];
    const rejectedOperations = [];
    let hasNewOperations = false;

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

        insertAppliedOperationStatement.run(
          operation.id,
          recoveryCode,
          operation.entityId,
          operation.type,
          operation.clientTimestamp,
          operation.deviceId
        );

        hasNewOperations = true;
        ackedOperationIds.push(operation.id);
      }

      const shouldPersistState = body.stateUpdatedAt >= profile.updatedAt;
      let nextProfile = profile;

      if (shouldPersistState && (hasNewOperations || body.stateUpdatedAt !== profile.updatedAt)) {
        const nextServerVersion = profile.serverVersion + 1;
        updateProfileStatement.run(
          JSON.stringify(body.state),
          body.stateUpdatedAt,
          nextServerVersion,
          recoveryCode
        );
        nextProfile = readProfile(recoveryCode);
      }

      db.exec('COMMIT');
      return buildSyncResponse(nextProfile, ackedOperationIds, rejectedOperations);
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  server.addHook('onClose', async () => {
    db.close();
  });

  return server;

  function buildStateResponse(profile) {
    return {
      schemaVersion: 1,
      serverVersion: profile.serverVersion,
      state: {
        world: profile.world,
        recoveryCode: profile.recoveryCode
      },
      serverTimestamp: profile.updatedAt
    };
  }

  function buildSyncResponse(profile, ackedOperationIds, rejectedOperations) {
    return {
      schemaVersion: 1,
      serverVersion: profile.serverVersion,
      ackedOperationIds,
      rejectedOperations,
      state: {
        world: profile.world,
        recoveryCode: profile.recoveryCode
      },
      serverTimestamp: profile.updatedAt
    };
  }

  function readProfile(recoveryCode) {
    const row = readProfileStatement.get(recoveryCode);

    if (!row) {
      return null;
    }

    return {
      recoveryCode: row.recovery_code,
      world: JSON.parse(row.world_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      serverVersion: Number(row.server_version)
    };
  }

  function generateUniqueRecoveryCode() {
    while (true) {
      const code = `MGF-${generateCodeBlock()}-${generateCodeBlock()}-${generateCodeBlock()}`;

      if (!readProfileStatement.get(code)) {
        return code;
      }
    }
  }

  function generateCodeBlock() {
    let block = '';

    for (let index = 0; index < 4; index += 1) {
      block += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }

    return block;
  }
}

function createEmptyWorldState(timestamp) {
  return {
    schemaVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSimulatedAt: timestamp,
    profile: {
      cash: 0,
      lifetimeCash: 0,
      totalDevicesShipped: 0,
      cloudEnabled: false,
      recoveryCode: null
    },
    activeLineId: '',
    lines: []
  };
}

function isValidBootstrapBody(body) {
  return Boolean(body)
    && typeof body === 'object'
    && typeof body.state === 'object'
    && body.state !== null;
}

function isValidSyncBody(body) {
  return Boolean(body)
    && typeof body === 'object'
    && typeof body.recoveryCode === 'string'
    && typeof body.stateUpdatedAt === 'string'
    && typeof body.state === 'object'
    && body.state !== null
    && Array.isArray(body.operations);
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
