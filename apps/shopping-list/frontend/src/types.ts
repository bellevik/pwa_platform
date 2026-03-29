export type ShoppingItem = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ShoppingOperationType = 'item_add' | 'item_toggle' | 'item_delete';

export type ShoppingOperation = {
  id: string;
  entityId: string;
  type: ShoppingOperationType;
  payload: {
    text?: string;
    completed?: boolean;
  };
  clientTimestamp: string;
  deviceId: string;
  status: 'pending' | 'failed';
  error?: string;
};

export type ShoppingListSnapshot = {
  items: ShoppingItem[];
  pendingCount: number;
  failedCount: number;
  failedOperations: ShoppingOperation[];
  lastSyncAt: string | null;
  serverVersion: number;
};

export type ShoppingListDebugInfo = {
  clientId: string;
  deviceId: string;
  storageKey: string;
  databaseName: string;
};

export type SyncRequestBody = import('@pwa-platform/offline').SyncRequest<ShoppingOperation>;

export type SyncResponseBody = import('@pwa-platform/offline').SyncResponse<{
  items: ShoppingItem[];
}>;
