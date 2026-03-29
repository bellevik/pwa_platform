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
  lastSyncAt: string | null;
  serverVersion: number;
};

export type SyncRequestBody = import('@pwa-platform/offline').SyncRequest<ShoppingOperation>;

export type SyncResponseBody = import('@pwa-platform/offline').SyncResponse<{
  items: ShoppingItem[];
}>;
