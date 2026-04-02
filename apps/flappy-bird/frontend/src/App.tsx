import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

type GameStatus = 'ready' | 'running' | 'gameover';

type Pipe = {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
};

type GameState = {
  status: GameStatus;
  birdY: number;
  birdVelocity: number;
  score: number;
  pipes: Pipe[];
  nextPipeId: number;
  spawnTimer: number;
  sceneShake: number;
};

const BEST_SCORE_STORAGE_KEY = 'flappy-bird.best-score';

const BIRD_X = 26;
const BIRD_RADIUS = 5.2;
const GROUND_TOP = 84;
const PIPE_WIDTH = 14.5;
const PIPE_GAP = 30;
const PIPE_START_X = 116;
const PIPE_SPACING = 58;
const PIPE_INTERVAL = 1.85;
const PIPE_SPEED = 24;
const GRAVITY = 118;
const FLAP_VELOCITY = -35;
const INITIAL_SPAWN_DELAY = 1.95;
const MAX_FRAME_DELTA = 0.032;
const MIN_GAP_CENTER = 24;
const MAX_GAP_CENTER = 56;
const MAX_GAP_SHIFT = 9;
const PIPE_COLLISION_OVERHANG = 1.5;

const CLOUDS = [
  { left: 8, top: 14, width: 7.6, duration: 28, delay: 0 },
  { left: 42, top: 10, width: 6.2, duration: 24, delay: 9 },
  { left: 74, top: 18, width: 8.4, duration: 31, delay: 15 }
] as const;

const loadBestScore = (): number => {
  try {
    const value = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    const parsed = Number.parseInt(value ?? '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const clampGapY = (value: number): number => Math.max(MIN_GAP_CENTER, Math.min(MAX_GAP_CENTER, value));

const randomGapY = (previousGapY?: number): number => {
  if (typeof previousGapY !== 'number') {
    return MIN_GAP_CENTER + Math.random() * (MAX_GAP_CENTER - MIN_GAP_CENTER);
  }

  const shift = (Math.random() * 2 - 1) * MAX_GAP_SHIFT;
  return clampGapY(previousGapY + shift);
};

const createPipe = (id: number, x: number, previousGapY?: number): Pipe => ({
  id,
  x,
  gapY: randomGapY(previousGapY),
  passed: false
});

const createInitialGame = (): GameState => {
  const firstPipe = createPipe(1, PIPE_START_X, 42);
  const secondPipe = createPipe(2, PIPE_START_X + PIPE_SPACING, firstPipe.gapY);

  return {
  status: 'ready',
  birdY: 44,
  birdVelocity: 0,
  score: 0,
  pipes: [firstPipe, secondPipe],
  nextPipeId: 3,
  spawnTimer: INITIAL_SPAWN_DELAY,
  sceneShake: 0
  };
};

const advanceGame = (current: GameState, delta: number, flapQueued: boolean): GameState => {
  if (current.status !== 'running') {
    if (current.sceneShake <= 0) {
      return current;
    }

    return {
      ...current,
      sceneShake: Math.max(0, current.sceneShake - delta * 5)
    };
  }

  let birdVelocity = flapQueued ? FLAP_VELOCITY : current.birdVelocity + GRAVITY * delta;
  let birdY = current.birdY + birdVelocity * delta;
  let spawnTimer = current.spawnTimer - delta;
  let nextPipeId = current.nextPipeId;
  let score = current.score;

  const pipes = current.pipes
    .map((pipe) => ({
      ...pipe,
      x: pipe.x - PIPE_SPEED * delta
    }))
    .map((pipe) => {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
        score += 1;
        return {
          ...pipe,
          passed: true
        };
      }

      return pipe;
    })
    .filter((pipe) => pipe.x + PIPE_WIDTH > -8);

  while (spawnTimer <= 0) {
    const previousPipe = pipes[pipes.length - 1];
    pipes.push(createPipe(nextPipeId, PIPE_START_X, previousPipe?.gapY));
    nextPipeId += 1;
    spawnTimer += PIPE_INTERVAL;
  }

  const hitBounds = birdY - BIRD_RADIUS <= 0 || birdY + BIRD_RADIUS >= GROUND_TOP;

  const hitPipe = pipes.some((pipe) => {
    const overlapsX = BIRD_X + BIRD_RADIUS > pipe.x - PIPE_COLLISION_OVERHANG
      && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH + PIPE_COLLISION_OVERHANG;

    if (!overlapsX) {
      return false;
    }

    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;

    return birdY - BIRD_RADIUS < gapTop || birdY + BIRD_RADIUS > gapBottom;
  });

  if (hitBounds || hitPipe) {
    birdY = Math.min(GROUND_TOP - BIRD_RADIUS, Math.max(BIRD_RADIUS, birdY));
    birdVelocity = 0;

    return {
      ...current,
      birdY,
      birdVelocity,
      score,
      pipes,
      nextPipeId,
      spawnTimer,
      status: 'gameover',
      sceneShake: 1
    };
  }

  return {
    ...current,
    birdY,
    birdVelocity,
    score,
    pipes,
    nextPipeId,
    spawnTimer
  };
};

export default function App() {
  const [bestScore, setBestScore] = useState(() => loadBestScore());
  const [lastScore, setLastScore] = useState(0);
  const [game, setGame] = useState<GameState>(() => createInitialGame());

  const gameRef = useRef(game);
  const lastFrameRef = useRef(0);
  const flapQueuedRef = useRef(false);
  const previousStatusRef = useRef<GameStatus>('ready');

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

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
    try {
      window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(bestScore));
    } catch {
      // Ignore storage write failures.
    }
  }, [bestScore]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    if (game.status === 'gameover' && previousStatus === 'running') {
      setLastScore(game.score);
      setBestScore((currentBest) => Math.max(currentBest, game.score));
    }

    previousStatusRef.current = game.status;
  }, [game.score, game.status]);

  const launchRun = useCallback(() => {
    lastFrameRef.current = 0;
    flapQueuedRef.current = false;
    const nextGame = {
      ...createInitialGame(),
      status: 'running',
      birdVelocity: FLAP_VELOCITY
    } satisfies GameState;

    gameRef.current = nextGame;
    setGame(nextGame);
  }, []);

  const triggerFlap = useCallback(() => {
    if (gameRef.current.status === 'running') {
      flapQueuedRef.current = true;
      return;
    }

    launchRun();
  }, [launchRun]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        triggerFlap();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerFlap]);

  useEffect(() => {
    let frameId = 0;

    const tick = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp;
      }

      const delta = Math.min(MAX_FRAME_DELTA, (timestamp - lastFrameRef.current) / 1000);
      lastFrameRef.current = timestamp;

      setGame((current) => {
        if (current.status !== 'running' && current.sceneShake <= 0) {
          return current;
        }

        const nextGame = advanceGame(current, delta, flapQueuedRef.current);
        flapQueuedRef.current = false;
        gameRef.current = nextGame;
        return nextGame;
      });

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const handleScenePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('button')) {
      return;
    }

    event.preventDefault();
    triggerFlap();
  };

  const birdTilt = game.status === 'gameover'
    ? 88
    : Math.max(-24, Math.min(70, game.birdVelocity * 1.35));

  const flightState = game.status === 'running'
    ? 'In flight'
    : game.status === 'gameover'
      ? 'Grounded'
      : 'Ready';

  const overlayTitle = game.status === 'ready' ? 'Tap to take off' : 'Crash landing';
  const overlayCopy = game.status === 'ready'
    ? 'Thread the bird through the pipes. Tap, click, or press Space to flap.'
    : game.score > 0
      ? `You cleared ${game.score} ${game.score === 1 ? 'gate' : 'gates'} before clipping a pipe.`
      : 'The first pipe is always the rudest. Launch again and find your rhythm.';
  const overlayBadge = game.status === 'gameover' && game.score >= bestScore && game.score > 0
    ? 'New local best'
    : 'Offline high score saved on this device';

  return (
    <main className="flappy-app">
      <header className="app-bar">
        <div>
          <p className="eyebrow">Single-Screen Arcade PWA</p>
          <h1>Sky Hopper</h1>
          <p className="app-intro">
            A bright, touch-first Flappy Bird clone built from the fixed-viewport template and tuned
            for quick offline runs.
          </p>
        </div>

        <div className="app-badges" aria-label="App status">
          <div className="status-pill">
            <span />
            Offline ready
          </div>
          <div className="badge-tile">
            <small>Best</small>
            <strong>{bestScore}</strong>
          </div>
        </div>
      </header>

      <section className="playfield-panel">
        <div
          aria-label="Flappy Bird playfield"
          className={`playfield ${game.sceneShake > 0 ? 'playfield--shake' : ''}`}
          onPointerDown={handleScenePointerDown}
          role="presentation"
        >
          <div className="sun" />

          {CLOUDS.map((cloud) => (
            <div
              className="cloud"
              key={`${cloud.left}-${cloud.top}`}
              style={{
                left: `${cloud.left}%`,
                top: `${cloud.top}%`,
                width: `${cloud.width}rem`,
                animationDuration: `${cloud.duration}s`,
                animationDelay: `-${cloud.delay}s`
              }}
            />
          ))}

          <div className="scoreboard" aria-live="polite">
            <div className="score-cluster">
              <div className="score-card">
                <small>Score</small>
                <strong>{game.score}</strong>
              </div>
              <div className="score-card score-card--soft">
                <small>Status</small>
                <strong>{flightState}</strong>
              </div>
            </div>

            <div className="score-card score-card--soft score-card--right">
              <small>Best Run</small>
              <strong>{bestScore}</strong>
            </div>
          </div>

          <div className="ridge ridge--back" />
          <div className="ridge ridge--front" />

          {game.pipes.map((pipe) => {
            const topHeight = Math.max(8, pipe.gapY - PIPE_GAP / 2);
            const bottomHeight = Math.max(8, GROUND_TOP - (pipe.gapY + PIPE_GAP / 2));

            return (
              <div className="pipe-pair" key={pipe.id} style={{ left: `${pipe.x}%`, width: `${PIPE_WIDTH}%` }}>
                <div className="pipe pipe--top" style={{ height: `${topHeight}%` }} />
                <div className="pipe pipe--bottom" style={{ height: `${bottomHeight}%` }} />
              </div>
            );
          })}

          <div
            className={`bird bird--${game.status}`}
            style={{
              left: `calc(${BIRD_X}% - var(--bird-size) / 2)`,
              top: `calc(${game.birdY}% - var(--bird-size) / 2)`
            }}
          >
            <div className="bird-body" style={{ transform: `rotate(${birdTilt}deg)` }}>
              <div className="bird-tail" />
              <div className="bird-wing" />
              <div className="bird-eye" />
              <div className="bird-beak" />
            </div>
          </div>

          <div className="ground">
            <div className="ground-track" />
          </div>

          <div className={`overlay ${game.status === 'running' ? 'overlay--hidden' : ''}`}>
            <div className="overlay-card">
              <p className="eyebrow">{overlayBadge}</p>
              <h2>{overlayTitle}</h2>
              <p>{overlayCopy}</p>

              <button
                className="cta-button"
                onClick={(event) => {
                  event.stopPropagation();
                  launchRun();
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                type="button"
              >
                {game.status === 'ready' ? 'Start Run' : 'Fly Again'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="control-strip">
        <article className="stat-card">
          <p className="eyebrow">Current</p>
          <strong>{game.score}</strong>
          <span>Points this run</span>
        </article>

        <article className="stat-card">
          <p className="eyebrow">Best</p>
          <strong>{bestScore}</strong>
          <span>Saved locally</span>
        </article>

        <article className="stat-card">
          <p className="eyebrow">Last Run</p>
          <strong>{lastScore}</strong>
          <span>Previous landing</span>
        </article>

        <article className="briefing-card">
          <p className="eyebrow">Flight Plan</p>
          <h2>Built from the single-screen template</h2>
          <p>
            The viewport stays locked, the controls are one-tap simple, and the best score persists
            offline so the app still feels native after install.
          </p>

          <div className="briefing-actions">
            {game.status !== 'running' ? (
              <button className="cta-button cta-button--secondary" onClick={launchRun} type="button">
                {game.status === 'ready' ? 'Start Run' : 'Fly Again'}
              </button>
            ) : null}
            <span className="control-hint">Tap the sky, click, or press Space / W / Up.</span>
          </div>
        </article>
      </section>
    </main>
  );
}
