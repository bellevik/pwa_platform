# Offline Sync

## Goal

Apps must remain useful offline after first successful load and must reconcile safely with their backend when connectivity returns.

## V1 Guarantees

- offline use is guaranteed only after the app has loaded successfully online at least once
- core app reads and writes must work without network access
- local changes must survive refresh, browser restart, and reopen
- queued changes must sync automatically when online returns

## Storage Layers

### Client-side

- IndexedDB for local app state
- IndexedDB for pending sync operations
- service worker cache for app shell and assets

### Server-side

- SQLite per app for canonical persisted state

## Local-First Write Contract

Every mutation follows this rule:

1. update local app state immediately
2. append a pending operation to the sync queue
3. render the optimistic local result immediately
4. sync later without blocking the UI

An app must never require a successful network request before showing the result of a core user action.

## Sync Endpoint

- method: `POST`
- path: `/api/<slug>/sync/`

## Operation Contract

Each operation must include:

- `id`: UUID idempotency key
- `entityId`: UUID for the affected entity
- `type`: app-defined operation type
- `payload`: operation data
- `clientTimestamp`: ISO-8601 timestamp
- `deviceId`: UUID for the device
- `status`: `pending`

Example:

```json
{
  "id": "7f59fd6a-2bd8-4a85-8f4d-cd1536d66355",
  "entityId": "4ea52cd2-7f5a-4ea9-9d6d-bb0ec58d99b6",
  "type": "item_add",
  "payload": {
    "text": "Milk"
  },
  "clientTimestamp": "2026-03-28T10:00:00.000Z",
  "deviceId": "6f0dc7e4-969c-4656-845e-a72cce58f1f8",
  "status": "pending"
}
```

## Sync Request Contract

```json
{
  "clientId": "6c0fbeb0-2dc2-42bf-8eec-eb42d2a80420",
  "deviceId": "6f0dc7e4-969c-4656-845e-a72cce58f1f8",
  "lastKnownServerVersion": 12,
  "operations": []
}
```

## Backend Rules

- process operations in request order
- treat `operation.id` as the idempotency key
- ignore already-applied operations safely
- persist canonical state in SQLite
- increment a monotonic `serverVersion`
- use last-write-wins for conflicting updates in V1
- preserve tombstones for deletes in V1 to avoid accidental resurrection across devices

## Sync Response Contract

```json
{
  "serverVersion": 13,
  "ackedOperationIds": [
    "7f59fd6a-2bd8-4a85-8f4d-cd1536d66355"
  ],
  "rejectedOperations": [],
  "state": {
    "items": []
  },
  "serverTimestamp": "2026-03-28T10:01:00.000Z"
}
```

## Reconciliation Rules

### Successful sync

1. remove acked operations from the local pending queue
2. mark rejected operations as failed and retain the reason
3. replace local canonical state with the server response state
4. reapply any newly-created local operations that were added after sync started

### Failed sync

- keep operations pending on network failure
- retry on app launch
- retry on reconnect
- retry on background backoff while the app is open

### Rejected operations

- do not silently discard them
- surface failure details in logs and debug tools
- allow app-specific handling if the operation can be repaired

## Verification Scenarios

Every backend-enabled app must pass these checks:

1. load online successfully
2. disconnect network
3. reopen offline
4. perform core writes offline
5. refresh offline
6. confirm local state and pending queue still exist
7. reconnect network
8. confirm pending operations sync and local state converges to server canonical state
9. confirm a second device can observe the synced canonical state
