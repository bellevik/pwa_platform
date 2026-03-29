import { useEffect, useMemo, useState } from 'react';
import { fetchRegistry, getFallbackRegistry, readCachedRegistry } from './lib/registry';
import type { AppRegistry, RegistrySource } from './types';

type RegistryState = {
  registry: AppRegistry;
  source: RegistrySource;
  loading: boolean;
  error: string | null;
};

const initialRegistry = readCachedRegistry() ?? getFallbackRegistry();

const initialState: RegistryState = {
  registry: initialRegistry,
  source: readCachedRegistry() ? 'cache' : 'fallback',
  loading: true,
  error: null
};

const statusLabels: Record<RegistrySource, string> = {
  network: 'Live registry',
  cache: 'Cached snapshot',
  fallback: 'Fallback shell state'
};

const formatGeneratedAt = (value: string): string => {
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
  const [state, setState] = useState<RegistryState>(initialState);

  useEffect(() => {
    let cancelled = false;

    fetchRegistry()
      .then((registry) => {
        if (cancelled) {
          return;
        }

        setState({
          registry,
          source: 'network',
          loading: false,
          error: null
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        const cachedRegistry = readCachedRegistry();

        setState({
          registry: cachedRegistry ?? getFallbackRegistry(),
          source: cachedRegistry ? 'cache' : 'fallback',
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown registry error'
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const generatedAt = useMemo(
    () => formatGeneratedAt(state.registry.generatedAt),
    [state.registry.generatedAt]
  );

  return (
    <main className="shell-app">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Modular PWA Platform</p>
          <h1>Homescreen shell</h1>
          <p className="hero-copy">
            The shell discovers installable apps from generated metadata and stays readable
            even when the network disappears.
          </p>
        </div>

        <div className="hero-meta">
          <span className={`status-pill status-pill--${state.source}`}>{statusLabels[state.source]}</span>
          <dl>
            <div>
              <dt>Apps</dt>
              <dd>{state.registry.apps.length}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{generatedAt}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="panel-header">
        <div>
          <p className="eyebrow">Registry</p>
          <h2>Available apps</h2>
        </div>
        <p className="panel-copy">
          Runtime-fetched registry with cached snapshot fallback. PWA install and offline
          caching comes next.
        </p>
      </section>

      {state.error ? (
        <section className="message-card message-card--warning">
          <strong>Registry fetch failed.</strong>
          <span>{state.error}</span>
        </section>
      ) : null}

      {state.loading ? (
        <section className="message-card">
          <strong>Loading registry...</strong>
          <span>Trying network first, then cached shell data if available.</span>
        </section>
      ) : null}

      <section className="app-grid" aria-label="Installed apps">
        {state.registry.apps.length > 0 ? (
          state.registry.apps.map((app) => (
            <a className="app-tile" href={app.route} key={app.slug}>
              <span className="app-icon" style={{ background: app.themeColor }} aria-hidden="true">
                <img alt="" className="app-icon-image" src={app.icon} />
              </span>
              <span className="app-name">{app.name}</span>
              <span className="app-description">{app.description}</span>
            </a>
          ))
        ) : (
          <article className="empty-state">
            <h3>No apps registered yet</h3>
            <p>
              Once `generated/app-registry.json` exists, the shell will render app tiles from it
              without hardcoding routes.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
