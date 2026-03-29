import test from 'node:test';
import assert from 'node:assert/strict';
import { rebuildItemsFromCanonicalState } from './item-replay';
import type { ShoppingItem, ShoppingOperation } from '../types';

const canonicalItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 'item-1',
  text: 'Milk',
  completed: false,
  createdAt: '2026-03-29T10:00:00.000Z',
  updatedAt: '2026-03-29T10:00:00.000Z',
  deletedAt: null,
  ...overrides
});

const operation = (overrides: Partial<ShoppingOperation> = {}): ShoppingOperation => ({
  id: 'op-1',
  entityId: 'item-1',
  type: 'item_toggle',
  payload: { completed: true },
  clientTimestamp: '2026-03-29T10:01:00.000Z',
  deviceId: 'device-1',
  status: 'pending',
  ...overrides
});

test('rebuildItemsFromCanonicalState reapplies pending toggle operations', () => {
  const items = rebuildItemsFromCanonicalState({
    canonicalItems: [canonicalItem()],
    operations: [operation()]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].completed, true);
  assert.equal(items[0].updatedAt, '2026-03-29T10:01:00.000Z');
});

test('rebuildItemsFromCanonicalState reapplies pending add operations', () => {
  const items = rebuildItemsFromCanonicalState({
    canonicalItems: [],
    operations: [
      operation({
        id: 'op-add',
        entityId: 'item-2',
        type: 'item_add',
        payload: { text: 'Bread' },
        clientTimestamp: '2026-03-29T10:02:00.000Z'
      })
    ]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'item-2');
  assert.equal(items[0].text, 'Bread');
  assert.equal(items[0].deletedAt, null);
});

test('rebuildItemsFromCanonicalState ignores failed operations', () => {
  const items = rebuildItemsFromCanonicalState({
    canonicalItems: [canonicalItem()],
    operations: [operation({ status: 'failed', error: 'invalid_payload' })]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].completed, false);
});

test('rebuildItemsFromCanonicalState preserves delete semantics', () => {
  const items = rebuildItemsFromCanonicalState({
    canonicalItems: [canonicalItem()],
    operations: [
      operation({
        id: 'op-delete',
        type: 'item_delete',
        payload: {},
        clientTimestamp: '2026-03-29T10:03:00.000Z'
      })
    ]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].deletedAt, '2026-03-29T10:03:00.000Z');
});
