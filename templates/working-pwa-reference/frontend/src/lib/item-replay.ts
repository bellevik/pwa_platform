import { sortOperationsByTimestamp } from '@pwa-platform/offline';
import type { ShoppingItem, ShoppingOperation } from '../types';

export function rebuildItemsFromCanonicalState(options: {
  canonicalItems: ShoppingItem[];
  operations: ShoppingOperation[];
}): ShoppingItem[] {
  const itemsById = new Map(
    options.canonicalItems.map((item) => [item.id, { ...item, deletedAt: item.deletedAt ?? null }])
  );

  for (const operation of sortOperationsByTimestamp(options.operations)) {
    if (operation.status !== 'pending') {
      continue;
    }

    applyPendingOperation(itemsById, operation);
  }

  return Array.from(itemsById.values());
}

function applyPendingOperation(itemsById: Map<string, ShoppingItem>, operation: ShoppingOperation): void {
  if (operation.type === 'item_add') {
    const existing = itemsById.get(operation.entityId);
    const nextItem: ShoppingItem = existing ?? {
      id: operation.entityId,
      text: operation.payload.text ?? 'Untitled item',
      completed: false,
      createdAt: operation.clientTimestamp,
      updatedAt: operation.clientTimestamp,
      deletedAt: null
    };

    itemsById.set(operation.entityId, {
      ...nextItem,
      text: operation.payload.text ?? nextItem.text,
      completed: false,
      updatedAt: operation.clientTimestamp,
      deletedAt: null
    });
    return;
  }

  const existing = itemsById.get(operation.entityId);

  if (!existing) {
    return;
  }

  if (operation.type === 'item_toggle') {
    itemsById.set(operation.entityId, {
      ...existing,
      completed: Boolean(operation.payload.completed),
      updatedAt: operation.clientTimestamp,
      deletedAt: null
    });
    return;
  }

  if (operation.type === 'item_delete') {
    itemsById.set(operation.entityId, {
      ...existing,
      deletedAt: operation.clientTimestamp,
      updatedAt: operation.clientTimestamp
    });
  }
}
