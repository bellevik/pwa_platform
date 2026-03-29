import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentNetworkStatus, subscribeToNetworkStatus } from '@pwa-platform/offline';
import {
  addItem,
  deleteItem,
  getSyncDebugInfo,
  refreshFromCanonicalState,
  getSnapshot,
  retryFailedOperations,
  syncItems,
  toggleItem
} from './lib/store';
import type { ShoppingListDebugInfo, ShoppingListSnapshot } from './types';

const initialSnapshot: ShoppingListSnapshot = {
  items: [],
  pendingCount: 0,
  failedCount: 0,
  failedOperations: [],
  lastSyncAt: null,
  serverVersion: 0
};

const debugInfo: ShoppingListDebugInfo = getSyncDebugInfo();

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export default function App() {
  const [snapshot, setSnapshot] = useState<ShoppingListSnapshot>(initialSnapshot);
  const [draft, setDraft] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(getCurrentNetworkStatus());

  const refreshSnapshot = useCallback(async () => {
    setSnapshot(await getSnapshot());
  }, []);

  const runSync = useCallback(
    async (reason: 'initial' | 'manual' | 'reconnect') => {
      if (!getCurrentNetworkStatus()) {
        setSyncMessage('Offline mode: changes stay local until the network returns.');
        return;
      }

      setIsSyncing(true);

      try {
        const result = await syncItems();
        await refreshSnapshot();

        if (result.sentOperations > 0) {
          setSyncMessage(`Synced ${result.sentOperations} queued change${result.sentOperations === 1 ? '' : 's'}.`);
        } else if (reason !== 'initial') {
          setSyncMessage('Everything is already in sync.');
        } else {
          setSyncMessage(null);
        }
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : 'Sync failed.');
      } finally {
        setIsSyncing(false);
      }
    },
    [refreshSnapshot]
  );

  useEffect(() => {
    void refreshSnapshot();
    void runSync('initial');
  }, [refreshSnapshot, runSync]);

  useEffect(() => {
    if (!isOnline) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void runSync('manual');
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOnline, runSync]);

  useEffect(() => {
    return subscribeToNetworkStatus((nextOnline) => {
      setIsOnline(nextOnline);

      if (nextOnline) {
        void runSync('reconnect');
        return;
      }

      setSyncMessage('Offline mode: changes stay local until the network returns.');
    });
  }, [runSync]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text) {
      return;
    }

    await addItem(text);
    setDraft('');
    await refreshSnapshot();

    if (getCurrentNetworkStatus()) {
      void runSync('manual');
    }
  };

  const handleToggle = async (id: string) => {
    await toggleItem(id);
    await refreshSnapshot();

    if (getCurrentNetworkStatus()) {
      void runSync('manual');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    await refreshSnapshot();

    if (getCurrentNetworkStatus()) {
      void runSync('manual');
    }
  };

  const handleRetryFailed = async () => {
    await retryFailedOperations();
    await refreshSnapshot();

    if (getCurrentNetworkStatus()) {
      void runSync('manual');
    }
  };

  const handleRefreshFromServer = async () => {
    if (!getCurrentNetworkStatus()) {
      setSyncMessage('Reconnect to refresh from the canonical server state.');
      return;
    }

    try {
      await refreshFromCanonicalState();
      await refreshSnapshot();
      setSyncMessage('Reloaded the latest canonical state from the server.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Refresh failed.');
    }
  };

  const completedCount = useMemo(
    () => snapshot.items.filter((item) => item.completed).length,
    [snapshot.items]
  );

  return (
    <main className="shopping-list-app">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Shopping List</p>
          <h1>Market-ready offline list</h1>
          <p className="hero-copy">
            Add groceries on the go, keep using the app without a signal, and let the queue
            sync back to the Mac Mini when you are online again.
          </p>
        </div>

        <div className="hero-stats">
          <article>
            <span>Total items</span>
            <strong>{snapshot.items.length}</strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{completedCount}</strong>
          </article>
          <article>
            <span>Queued changes</span>
            <strong>{snapshot.pendingCount}</strong>
          </article>
        </div>
      </section>

      <section className="status-row">
        <span className={`pill ${isOnline ? 'pill--online' : 'pill--offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <span className="pill pill--muted">Last sync: {formatTimestamp(snapshot.lastSyncAt)}</span>
        <span className="pill pill--muted">Server version: {snapshot.serverVersion}</span>
      </section>

      {syncMessage ? <section className="notice-card">{syncMessage}</section> : null}

      {snapshot.failedOperations.length > 0 ? (
        <section className="notice-card notice-card--warning">
          <strong>{snapshot.failedOperations.length} change{snapshot.failedOperations.length === 1 ? '' : 's'} need attention.</strong>
          <ul className="failed-ops-list">
            {snapshot.failedOperations.map((operation) => (
              <li key={operation.id}>
                <span>{operation.type.replace('item_', '').replace('-', ' ')}</span>
                <span>{operation.error ?? 'Unknown sync failure'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="workspace-grid">
        <article className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quick Add</p>
              <h2>Capture items instantly</h2>
            </div>
            <button className="secondary-button" type="button" onClick={() => void runSync('manual')} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync now'}
            </button>
          </div>

          <div className="action-row">
            <button className="secondary-button" type="button" onClick={handleRefreshFromServer}>
              Refresh from server
            </button>
          </div>

          <form className="add-form" onSubmit={handleSubmit}>
            <input
              aria-label="New shopping list item"
              className="item-input"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add milk, basil, oat flour..."
              value={draft}
            />
            <button className="primary-button" type="submit">
              Add item
            </button>
          </form>

          <div className="queue-summary">
            <div>
              <strong>{snapshot.pendingCount}</strong>
              <span>pending</span>
            </div>
            <div>
              <strong>{snapshot.failedCount}</strong>
              <span>failed</span>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={handleRetryFailed}
              disabled={snapshot.failedCount === 0}
            >
              Retry failed
            </button>
          </div>

          <p className="sync-footnote">
            While online, the app retries quietly in the background every 20 seconds and on reconnect.
          </p>
        </article>

        <article className="panel list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Live shopping queue</h2>
            </div>
          </div>

          {snapshot.items.length > 0 ? (
            <ul className="item-list">
              {snapshot.items.map((item) => (
                <li className={`item-card ${item.completed ? 'item-card--done' : ''}`} key={item.id}>
                  <button className="toggle-button" type="button" onClick={() => void handleToggle(item.id)}>
                    {item.completed ? 'Done' : 'Open'}
                  </button>

                  <div className="item-copy">
                    <strong>{item.text}</strong>
                    <span>Updated {formatTimestamp(item.updatedAt)}</span>
                  </div>

                  <button className="delete-button" type="button" onClick={() => void handleDelete(item.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <h3>Your list is empty</h3>
              <p>Add a few items now. They will stay available offline after the first load.</p>
            </div>
          )}
        </article>

        <article className="panel debug-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Sync Debug</p>
              <h2>Queue and canonical state</h2>
            </div>
          </div>

          <div className="debug-grid">
            <div>
              <span className="debug-label">Pending queue</span>
              <strong>{snapshot.pendingCount}</strong>
            </div>
            <div>
              <span className="debug-label">Failed queue</span>
              <strong>{snapshot.failedCount}</strong>
            </div>
            <div>
              <span className="debug-label">Server version</span>
              <strong>{snapshot.serverVersion}</strong>
            </div>
            <div>
              <span className="debug-label">Last sync</span>
              <strong>{formatTimestamp(snapshot.lastSyncAt)}</strong>
            </div>
            <div>
              <span className="debug-label">Client ID</span>
              <strong className="debug-code">{debugInfo.clientId}</strong>
            </div>
            <div>
              <span className="debug-label">Device ID</span>
              <strong className="debug-code">{debugInfo.deviceId}</strong>
            </div>
            <div>
              <span className="debug-label">Storage key</span>
              <strong className="debug-code">{debugInfo.storageKey}</strong>
            </div>
            <div>
              <span className="debug-label">IndexedDB</span>
              <strong className="debug-code">{debugInfo.databaseName}</strong>
            </div>
          </div>

          <div className="debug-list-wrap">
            <h3>Failed operations</h3>
            {snapshot.failedOperations.length > 0 ? (
              <ul className="debug-list">
                {snapshot.failedOperations.map((operation) => (
                  <li key={operation.id}>
                    <strong>{operation.type}</strong>
                    <span>{operation.error ?? 'Unknown error'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="debug-empty">No failed operations right now.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
