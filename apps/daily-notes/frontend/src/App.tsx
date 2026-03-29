export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Daily Notes</p>
        <h1>Template app scaffold</h1>
        <p className="copy">Quick capture notes app used to prove the generated static app workflow</p>
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
          <p>Backend enabled: false</p>
          <p>API base: `/api/daily-notes/`</p>
        </article>

        <article className="panel">
          <h2>Next implementation tasks</h2>
          <p>Replace this scaffold with app-specific UI, IndexedDB state, and sync logic.</p>
        </article>
      </section>
    </main>
  );
}
