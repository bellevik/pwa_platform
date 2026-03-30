import { useEffect } from 'react';

const quickActions = [
  'Primary action',
  'Secondary action',
  'Offline status',
  'Settings'
];

export default function App() {
  useEffect(() => {
    const syncViewportHeight = () => {
      const viewportHeight = Math.max(window.innerHeight, window.visualViewport?.height ?? 0);
      const screenHeight = window.matchMedia('(orientation: portrait)').matches
        ? Math.max(window.screen.height, window.screen.width)
        : Math.min(window.screen.height, window.screen.width);
      const fullHeight = Math.max(viewportHeight, screenHeight);

      document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
      document.documentElement.style.setProperty('--app-screen-height', `${Math.round(fullHeight)}px`);
      document.documentElement.style.setProperty('--app-bottom-gap', `${Math.round(fullHeight - viewportHeight)}px`);
    };

    syncViewportHeight();
    window.addEventListener('resize', syncViewportHeight);
    window.visualViewport?.addEventListener('resize', syncViewportHeight);

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.visualViewport?.removeEventListener('resize', syncViewportHeight);
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">__APP_NAME__</p>
          <h1>Single-screen scaffold</h1>
          <p className="copy">__APP_DESCRIPTION__</p>
        </div>
        <div className="status-pill">
          <span />
          Full-screen mode
        </div>
      </header>

      <section className="focus-panel">
        <p className="eyebrow">Focus area</p>
        <h2>Keep your primary interaction here</h2>
        <p>
          This preset is meant for tools that must fit inside one mobile viewport without
          any scrolling.
        </p>
      </section>

      <section className="action-grid">
        {quickActions.map((action) => (
          <article className="action-card" key={action}>
            <p className="eyebrow">Action</p>
            <strong>{action}</strong>
            <span>Replace this block with app-specific controls.</span>
          </article>
        ))}
      </section>

      <section className="footer-panel">
        <p className="eyebrow">Implementation notes</p>
        <p>
          Preserve the fixed viewport structure, safe-area handling, and no-scroll behavior when
          adapting this scaffold.
        </p>
      </section>
    </main>
  );
}
