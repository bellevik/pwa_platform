import { useEffect, useMemo, useState } from 'react';

type HistoryEntry = {
  expression: string;
  result: string;
  recordedAt: string;
};

const HISTORY_STORAGE_KEY = 'calculator.history';
const MAX_HISTORY_ENTRIES = 8;

const keypadRows = [
  ['AC', 'DEL', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['+/-', '0', '.', '=']
] as const;

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHistory = (entries: HistoryEntry[]) => {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
};

const formatResult = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new Error('Result is not finite');
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(10).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
};

const safeEvaluate = (expression: string): string => {
  const sanitized = expression.replace(/\s+/g, '');

  if (!sanitized) {
    return '0';
  }

  if (!/^[0-9.+\-*/()%]+$/.test(sanitized)) {
    throw new Error('Unsupported input');
  }

  const normalized = sanitized.replace(/%/g, '/100');
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${normalized});`)() as number;
  return formatResult(result);
};

const getPreview = (expression: string): string => {
  try {
    return safeEvaluate(expression);
  } catch {
    return expression ? '...' : '0';
  }
};

export default function App() {
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [accentPulse, setAccentPulse] = useState(false);

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

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    if (!accentPulse) {
      return;
    }

    const timeoutId = window.setTimeout(() => setAccentPulse(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [accentPulse]);

  const preview = useMemo(() => getPreview(expression), [expression]);
  const visibleHistory = history.slice(0, 4);

  const appendValue = (value: string) => {
    setExpression((current) => {
      if (current === '0' && /\d/.test(value)) {
        return value;
      }

      return `${current}${value}`;
    });
  };

  const handleEvaluate = () => {
    try {
      const result = safeEvaluate(expression);
      const normalizedExpression = expression || '0';

      setDisplay(result);
      setExpression(result);
      setHistory((current) => [
        {
          expression: normalizedExpression,
          result,
          recordedAt: new Date().toISOString()
        },
        ...current
      ].slice(0, MAX_HISTORY_ENTRIES));
      setAccentPulse(true);
    } catch {
      setDisplay('Error');
      setAccentPulse(true);
    }
  };

  const handleAction = (value: string) => {
    if (value === 'AC') {
      setExpression('');
      setDisplay('0');
      return;
    }

    if (value === 'DEL') {
      setExpression((current) => current.slice(0, -1));
      return;
    }

    if (value === '=') {
      handleEvaluate();
      return;
    }

    if (value === '+/-') {
      setExpression((current) => {
        if (!current) {
          return '-';
        }

        return current.startsWith('-') ? current.slice(1) : `-${current}`;
      });
      return;
    }

    appendValue(value);
  };

  return (
    <main className={`calculator-app ${accentPulse ? 'calculator-app--pulse' : ''}`}>
      <section className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Calculator PWA</p>
            <h1>Neural Arc</h1>
          </div>
          <div className="header-actions">
            <div className="status-pill" aria-hidden="true">
              <span />
              Offline ready
            </div>
            <button className="ghost-button" onClick={() => setHistory([])} type="button">
              Clear history
            </button>
          </div>
        </header>

        <article className="display-panel">
          <div className="display-meta">
            <span>Input stream</span>
            <strong>{expression || 'Waiting for input'}</strong>
          </div>
          <div className="display-screen">
            <span className="display-preview">Preview {preview}</span>
            <output>{display === 'Error' ? display : preview}</output>
          </div>
        </article>

        <section className="workspace">
          <article className="keypad-panel">
            <div className="keypad-grid">
              {keypadRows.flat().map((key) => {
                const variant = ['/', '*', '-', '+', '='].includes(key)
                  ? 'key--accent'
                  : ['AC', 'DEL', '+/-', '%'].includes(key)
                    ? 'key--muted'
                    : 'key--default';

                return (
                  <button
                    className={`key ${variant}`}
                    key={key}
                    onClick={() => handleAction(key)}
                    type="button"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </article>

          <article className="history-panel">
            <div className="history-heading">
              <div>
                <p className="eyebrow">Recent Results</p>
                <h2>Local memory</h2>
              </div>
              <span className="history-count">{history.length}/{MAX_HISTORY_ENTRIES}</span>
            </div>

            {visibleHistory.length > 0 ? (
              <ul className="history-list">
                {visibleHistory.map((entry) => (
                  <li key={`${entry.recordedAt}-${entry.expression}`}>
                    <button
                      className="history-entry"
                      onClick={() => {
                        setExpression(entry.expression);
                        setDisplay(entry.result);
                      }}
                      type="button"
                    >
                      <span>{entry.expression}</span>
                      <strong>{entry.result}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="history-empty">Recent answers stay local and available offline.</p>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
