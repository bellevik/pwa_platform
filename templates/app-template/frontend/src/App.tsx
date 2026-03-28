export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">__APP_NAME__</p>
        <h1>Template app scaffold</h1>
        <p className="copy">__APP_DESCRIPTION__</p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Offline-first baseline</h2>
          <p>
            This app is scaffolded to become a route-local PWA that should remain usable
            offline after its first successful load.
          </p>
        </article>

        <article className="panel">
          <h2>Backend mode</h2>
          <p>Backend enabled: __HAS_BACKEND__</p>
          <p>API base: `/api/__APP_SLUG__/`</p>
        </article>

        <article className="panel">
          <h2>Next implementation tasks</h2>
          <p>Replace this scaffold with app-specific UI, IndexedDB state, and sync logic.</p>
        </article>
      </section>
    </main>
  );
}
