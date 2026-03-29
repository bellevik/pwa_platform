export type BaseSyncOperation<TType extends string = string, TPayload = Record<string, unknown>> = {
  id: string;
  entityId: string;
  type: TType;
  payload: TPayload;
  clientTimestamp: string;
  deviceId: string;
  status: 'pending' | 'failed';
  error?: string;
};

export type RejectedSyncOperation = {
  id: string;
  reason: string;
};

export type SyncRequest<TOperation extends BaseSyncOperation> = {
  schemaVersion: number;
  clientId: string;
  deviceId: string;
  lastKnownServerVersion: number;
  operations: Array<{
    id: TOperation['id'];
    entityId: TOperation['entityId'];
    type: TOperation['type'];
    payload: TOperation['payload'];
    clientTimestamp: TOperation['clientTimestamp'];
    deviceId: TOperation['deviceId'];
    status: 'pending';
  }>;
};

export type SyncResponse<TState> = {
  schemaVersion: number;
  serverVersion: number;
  ackedOperationIds: string[];
  rejectedOperations: RejectedSyncOperation[];
  state: TState;
  serverTimestamp: string;
};

export function sortOperationsByTimestamp<TOperation extends { clientTimestamp: string }>(
  operations: TOperation[]
): TOperation[] {
  return [...operations].sort((left, right) => left.clientTimestamp.localeCompare(right.clientTimestamp));
}

export function buildSyncRequest<TOperation extends BaseSyncOperation>(options: {
  clientId: string;
  deviceId: string;
  lastKnownServerVersion: number;
  operations: TOperation[];
  schemaVersion?: number;
}): SyncRequest<TOperation> {
  return {
    schemaVersion: options.schemaVersion ?? 1,
    clientId: options.clientId,
    deviceId: options.deviceId,
    lastKnownServerVersion: options.lastKnownServerVersion,
    operations: options.operations.map((operation) => ({
      id: operation.id,
      entityId: operation.entityId,
      type: operation.type,
      payload: operation.payload,
      clientTimestamp: operation.clientTimestamp,
      deviceId: operation.deviceId,
      status: 'pending'
    }))
  };
}

export function reconcileSyncOperations<TOperation extends BaseSyncOperation>(options: {
  operations: TOperation[];
  ackedOperationIds: string[];
  rejectedOperations: RejectedSyncOperation[];
}): TOperation[] {
  const ackedIds = new Set(options.ackedOperationIds);
  const rejectedById = new Map(options.rejectedOperations.map((entry) => [entry.id, entry.reason]));

  return options.operations
    .map((operation) => {
      if (ackedIds.has(operation.id)) {
        return null;
      }

      const reason = rejectedById.get(operation.id);

      if (reason) {
        return {
          ...operation,
          status: 'failed' as const,
          error: reason
        };
      }

      return operation;
    })
    .filter((operation): operation is TOperation => operation !== null);
}
