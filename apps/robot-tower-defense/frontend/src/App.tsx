import { useEffect, useMemo, useRef, useState } from 'react';
import { getTowerDefinition, getTowerTier, getUpgradeCost, getSellValue } from './game/balance';
import { FIXED_TIMESTEP, buildTower, createBattleState, sellTower, startNextWave, stepBattle, upgradeTower } from './game/engine';
import { applyStageResult, loadSave, saveProgress } from './game/save';
import { getStage, getStageStars, STAGES } from './game/stages';
import type { BattleState, SaveData, TowerTypeId } from './game/types';
import { Battlefield } from './render/Battlefield';

type Screen = 'title' | 'stage-select' | 'battle';
type HomeTab = 'campaign' | 'intel' | 'foundry';

const TOWER_ORDER: TowerTypeId[] = ['pulse', 'arc', 'cryo', 'rail', 'mortar'];

function syncViewportHeight() {
  const viewportHeight = Math.max(window.innerHeight, window.visualViewport?.height ?? 0);
  const screenHeight = window.matchMedia('(orientation: portrait)').matches
    ? Math.max(window.screen.height, window.screen.width)
    : Math.min(window.screen.height, window.screen.width);
  const fullHeight = Math.max(viewportHeight, screenHeight);

  document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
  document.documentElement.style.setProperty('--app-screen-height', `${Math.round(fullHeight)}px`);
  document.documentElement.style.setProperty('--app-bottom-gap', `${Math.round(fullHeight - viewportHeight)}px`);
}

function starsLabel(count: number): string {
  return '*'.repeat(count).padEnd(3, '-');
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [homeTab, setHomeTab] = useState<HomeTab>('campaign');
  const [towerPreviewIndex, setTowerPreviewIndex] = useState(0);
  const [saveData, setSaveData] = useState<SaveData>(() => loadSave());
  const [currentStageId, setCurrentStageId] = useState(1);
  const [stagePreviewId, setStagePreviewId] = useState(1);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);

  const stage = useMemo(() => getStage(currentStageId), [currentStageId]);
  const stagePreview = useMemo(() => getStage(stagePreviewId), [stagePreviewId]);
  const previewTower = getTowerDefinition(TOWER_ORDER[towerPreviewIndex]);
  const previewTowerTier = previewTower.tiers[0];
  const battleRef = useRef<BattleState | null>(null);
  const pauseRef = useRef(paused);
  const speedRef = useRef(speed);
  const handledVictoryRef = useRef<string | null>(null);

  useEffect(() => {
    syncViewportHeight();
    window.addEventListener('resize', syncViewportHeight);
    window.visualViewport?.addEventListener('resize', syncViewportHeight);

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.visualViewport?.removeEventListener('resize', syncViewportHeight);
    };
  }, []);

  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  useEffect(() => {
    pauseRef.current = paused;
  }, [paused]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    saveProgress(saveData);
  }, [saveData]);

  useEffect(() => {
    if (screen !== 'battle' || !battle) {
      return;
    }

    let frameId = 0;
    let lastFrameTime = 0;
    let accumulator = 0;

    const tick = (timestamp: number) => {
      const currentBattle = battleRef.current;

      if (!currentBattle) {
        return;
      }

      if (lastFrameTime === 0) {
        lastFrameTime = timestamp;
      }

      const delta = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
      lastFrameTime = timestamp;

      if (!pauseRef.current && currentBattle.status === 'running') {
        accumulator += delta * speedRef.current;
        let nextBattle = currentBattle;

        while (accumulator >= FIXED_TIMESTEP) {
          nextBattle = stepBattle(nextBattle, stage, FIXED_TIMESTEP);
          accumulator -= FIXED_TIMESTEP;
        }

        if (nextBattle !== currentBattle) {
          battleRef.current = nextBattle;
          setBattle(nextBattle);
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [battle, screen, stage]);

  useEffect(() => {
    if (!battle || battle.status !== 'won') {
      return;
    }

    const resultKey = `${battle.stageId}:${battle.coreIntegrity}`;

    if (handledVictoryRef.current === resultKey) {
      return;
    }

    handledVictoryRef.current = resultKey;

    setSaveData((currentSave) => applyStageResult(currentSave, {
      stageId: battle.stageId,
      stars: getStageStars(stage, battle.coreIntegrity),
      coreIntegrity: battle.coreIntegrity
    }));
  }, [battle, stage]);

  useEffect(() => {
    if (!battle) {
      return;
    }

    if (selectedTowerId != null && !battle.towers.some((tower) => tower.id === selectedTowerId)) {
      setSelectedTowerId(null);
    }

    if (selectedPadId != null && battle.towers.some((tower) => tower.padId === selectedPadId)) {
      setSelectedPadId(null);
    }
  }, [battle, selectedPadId, selectedTowerId]);

  const selectedTower = battle?.towers.find((tower) => tower.id === selectedTowerId) ?? null;
  const selectedTowerDefinition = selectedTower ? getTowerDefinition(selectedTower.typeId) : null;
  const selectedTowerTier = selectedTower ? getTowerTier(selectedTower) : null;
  const selectedPadOccupied = battle?.towers.some((tower) => tower.padId === selectedPadId) ?? false;
  const currentStageStars = battle?.status === 'won'
    ? getStageStars(stage, battle.coreIntegrity)
    : saveData.stageStars[String(stage.id)] ?? 0;
  const previewUnlocked = stagePreview.id <= saveData.unlockedStage;
  const currentWaveLabel = battle
    ? battle.activeWaveIndex != null
      ? battle.activeWaveIndex + 1
      : Math.min(stage.waves.length, battle.nextWaveIndex + 1)
    : 1;

  const startStage = (stageId: number) => {
    const nextStage = getStage(stageId);
    handledVictoryRef.current = null;
    setCurrentStageId(nextStage.id);
    setStagePreviewId(nextStage.id);
    setBattle(createBattleState(nextStage));
    setSelectedPadId(null);
    setSelectedTowerId(null);
    setPaused(false);
    setSpeed(1);
    setScreen('battle');
  };

  const openStageSelect = () => {
    setStagePreviewId(Math.min(Math.max(currentStageId, 1), Math.min(saveData.unlockedStage, STAGES.length)));
    setScreen('stage-select');
    setSelectedPadId(null);
    setSelectedTowerId(null);
    setPaused(false);
  };

  const handleSelectPad = (padId: string) => {
    const existingTower = battle?.towers.find((tower) => tower.padId === padId);

    if (existingTower) {
      setSelectedTowerId(existingTower.id);
      setSelectedPadId(null);
      return;
    }

    setSelectedPadId((current) => current === padId ? null : padId);
    setSelectedTowerId(null);
  };

  const handleBuildTower = (typeId: TowerTypeId) => {
    if (!battle || !selectedPadId) {
      return;
    }

    const nextBattle = buildTower(battle, selectedPadId, typeId);
    battleRef.current = nextBattle;
    setBattle(nextBattle);
    const builtTower = nextBattle.towers.find((tower) => tower.padId === selectedPadId && tower.typeId === typeId);
    setSelectedPadId(null);
    setSelectedTowerId(builtTower?.id ?? null);
  };

  const handleUpgradeTower = () => {
    if (!battle || !selectedTower) {
      return;
    }

    const nextBattle = upgradeTower(battle, selectedTower.id);
    battleRef.current = nextBattle;
    setBattle(nextBattle);
  };

  const handleSellTower = () => {
    if (!battle || !selectedTower) {
      return;
    }

    const nextBattle = sellTower(battle, selectedTower.id);
    battleRef.current = nextBattle;
    setBattle(nextBattle);
    setSelectedTowerId(null);
    setSelectedPadId(selectedTower.padId);
  };

  const handleStartWave = () => {
    if (!battle) {
      return;
    }

    const nextBattle = startNextWave(battle, stage);
    battleRef.current = nextBattle;
    setBattle(nextBattle);
  };

  const cycleTowerPreview = (direction: -1 | 1) => {
    setTowerPreviewIndex((current) => (current + direction + TOWER_ORDER.length) % TOWER_ORDER.length);
  };

  const nudgeStagePreview = (direction: -1 | 1) => {
    setStagePreviewId((current) => Math.max(1, Math.min(STAGES.length, current + direction)));
  };

  if (screen === 'title') {
    return (
      <main className="app-shell title-shell">
        <section className="title-hero panel">
          <div className="hero-copy-block">
            <p className="eyebrow">World 1 / Factory Frontier</p>
            <h1>Robot Tower Defense</h1>
            <p className="copy">Portrait-first scrapyard defense with fixed pads and manual wave launches.</p>
          </div>

          <div className="hero-reactor" aria-hidden="true">
            <div className="hero-reactor-core" />
            <div className="hero-reactor-ring hero-reactor-ring--outer" />
            <div className="hero-reactor-ring hero-reactor-ring--inner" />
          </div>
        </section>

        <section className="home-panel panel">
          {homeTab === 'campaign' ? (
            <div className="home-panel-body">
              <p className="eyebrow">Campaign</p>
              <h2>Defend the frontier foundry</h2>
              <p className="sheet-copy">Ten stages, one escalating world, and a Forge Titan waiting at the gate.</p>
              <div className="mini-stat-grid compact-grid">
                <div className="detail-card compact-card">
                  <strong>{Math.min(saveData.unlockedStage, STAGES.length)}</strong>
                  <span>Unlocked</span>
                </div>
                <div className="detail-card compact-card">
                  <strong>{Object.values(saveData.stageStars).reduce((sum, stars) => sum + stars, 0)}</strong>
                  <span>Stars</span>
                </div>
              </div>
              <div className="button-row split-row">
                <button className="action-button action-button--primary" type="button" onClick={openStageSelect}>
                  Stage select
                </button>
                <button className="action-button" type="button" onClick={() => startStage(Math.min(saveData.unlockedStage, STAGES.length))}>
                  Quick deploy
                </button>
              </div>
            </div>
          ) : null}

          {homeTab === 'intel' ? (
            <div className="home-panel-body">
              <p className="eyebrow">Intel</p>
              <h2>Scrapyard threat report</h2>
              <div className="mini-stat-grid intel-grid">
                <div className="detail-card compact-card">
                  <strong>5 + 1</strong>
                  <span>Enemy roster</span>
                </div>
                <div className="detail-card compact-card">
                  <strong>Offline</strong>
                  <span>PWA ready</span>
                </div>
                <div className="detail-card compact-card wide-card">
                  <strong>Forge Titan</strong>
                  <span>Shielded boss with support summons in stage 1-10.</span>
                </div>
                <div className="detail-card compact-card wide-card">
                  <strong>Factory Frontier</strong>
                  <span>One portrait-first world tuned around fixed pad choke points.</span>
                </div>
              </div>
            </div>
          ) : null}

          {homeTab === 'foundry' ? (
            <div className="home-panel-body">
              <p className="eyebrow">Tower Foundry</p>
              <div className="preview-head">
                <button className="round-control" type="button" onClick={() => cycleTowerPreview(-1)}>
                  -
                </button>
                <div className="preview-copy">
                  <h2>{previewTower.name}</h2>
                  <p className="sheet-copy">{previewTower.role}</p>
                </div>
                <button className="round-control" type="button" onClick={() => cycleTowerPreview(1)}>
                  +
                </button>
              </div>
              <div className="mini-stat-grid compact-grid tower-grid">
                <div className="detail-card compact-card">
                  <strong>{previewTowerTier.cost}</strong>
                  <span>Build cost</span>
                </div>
                <div className="detail-card compact-card">
                  <strong>{Math.round(previewTowerTier.range)}</strong>
                  <span>Range</span>
                </div>
                <div className="detail-card compact-card">
                  <strong>{Math.round(previewTowerTier.damage)}</strong>
                  <span>Damage</span>
                </div>
                <div className="detail-card compact-card">
                  <strong>{previewTowerTier.cooldown.toFixed(2)}s</strong>
                  <span>Cooldown</span>
                </div>
              </div>
              <p className="sheet-copy">{previewTowerTier.description}</p>
              <div className="tower-dot-row" aria-label="Tower preview selector">
                {TOWER_ORDER.map((typeId, index) => (
                  <button
                    className={`tower-dot ${index === towerPreviewIndex ? 'is-active' : ''}`}
                    key={typeId}
                    type="button"
                    onClick={() => setTowerPreviewIndex(index)}
                  >
                    <span className="sr-only">{typeId}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <nav className="home-tabbar panel" aria-label="Home sections">
          {(['campaign', 'intel', 'foundry'] as const).map((tabId) => (
            <button
              className={`home-tab ${homeTab === tabId ? 'is-active' : ''}`}
              key={tabId}
              type="button"
              onClick={() => setHomeTab(tabId)}
            >
              {tabId}
            </button>
          ))}
        </nav>
      </main>
    );
  }

  if (screen === 'stage-select') {
    return (
      <main className="app-shell select-shell">
        <section className="select-head panel">
          <div>
            <p className="eyebrow">Factory Frontier</p>
            <h1>Deployment map</h1>
            <p className="copy">Choose one stage card and deploy. No scrolling, just mission hopping.</p>
          </div>
          <button className="action-button" type="button" onClick={() => setScreen('title')}>
            Home
          </button>
        </section>

        <section className="stage-focus panel">
          <div className="stage-focus-nav">
            <button className="round-control" disabled={stagePreview.id === 1} type="button" onClick={() => nudgeStagePreview(-1)}>
              -
            </button>
            <p className="stage-index">{stagePreview.name}</p>
            <button className="round-control" disabled={stagePreview.id === STAGES.length} type="button" onClick={() => nudgeStagePreview(1)}>
              +
            </button>
          </div>

          <div className="stage-focus-copy">
            <h2>{stagePreview.subtitle}</h2>
            <p className="sheet-copy">{stagePreview.briefing}</p>
          </div>

          <div className="mini-stat-grid stage-stat-grid">
            <div className="detail-card compact-card">
              <strong>{stagePreview.waves.length}</strong>
              <span>Waves</span>
            </div>
            <div className="detail-card compact-card">
              <strong>{stagePreview.pads.length}</strong>
              <span>Pads</span>
            </div>
            <div className="detail-card compact-card">
              <strong>{starsLabel(saveData.stageStars[String(stagePreview.id)] ?? 0)}</strong>
              <span>Rating</span>
            </div>
            <div className="detail-card compact-card">
              <strong>{previewUnlocked ? 'Ready' : 'Locked'}</strong>
              <span>Status</span>
            </div>
          </div>

          <div className="button-row split-row">
            <button className="action-button" type="button" onClick={() => setStagePreviewId(Math.min(saveData.unlockedStage, STAGES.length))}>
              Jump to unlock
            </button>
            <button
              className="action-button action-button--primary"
              disabled={!previewUnlocked}
              type="button"
              onClick={() => startStage(stagePreview.id)}
            >
              Deploy stage
            </button>
          </div>
        </section>

        <section className="stage-node-panel panel">
          <div className="stage-node-grid" aria-label="Factory Frontier stage buttons">
            {STAGES.map((stageItem) => {
              const unlocked = stageItem.id <= saveData.unlockedStage;
              const selected = stageItem.id === stagePreview.id;
              return (
                <button
                  className={`stage-node ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}`}
                  disabled={!unlocked}
                  key={stageItem.id}
                  type="button"
                  onClick={() => setStagePreviewId(stageItem.id)}
                >
                  <strong>{stageItem.id}</strong>
                  <span>{saveData.stageStars[String(stageItem.id)] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (!battle) {
    return null;
  }

  return (
    <main className="app-shell battle-shell">
      <section className="battle-top panel">
        <div className="battle-top-copy">
          <p className="eyebrow">{stage.name}</p>
          <h2>{stage.subtitle}</h2>
        </div>
        <div className="hud-stats">
          <div className="hud-stat compact-card">
            <strong>{battle.credits}</strong>
            <span>Credits</span>
          </div>
          <div className="hud-stat compact-card">
            <strong>{battle.coreIntegrity}</strong>
            <span>Core</span>
          </div>
          <div className="hud-stat compact-card">
            <strong>{Math.min(currentWaveLabel, stage.waves.length)}/{stage.waves.length}</strong>
            <span>Wave</span>
          </div>
        </div>
      </section>

      <section className="battlefield-card panel">
        <Battlefield
          battle={battle}
          stage={stage}
          selectedPadId={selectedPadId}
          selectedTowerId={selectedTowerId}
          onSelectPad={handleSelectPad}
          onSelectTower={(towerId) => {
            setSelectedTowerId(towerId);
            setSelectedPadId(null);
          }}
        />

        <div className="battle-overlay battle-overlay--top">
          <button className="floating-chip" type="button" onClick={openStageSelect}>
            Exit
          </button>
          <div className="floating-cluster">
            <button className="floating-chip" type="button" onClick={() => setPaused((current) => !current)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="floating-chip" type="button" onClick={() => setSpeed((current) => current === 1 ? 2 : 1)}>
              x{speed}
            </button>
          </div>
        </div>

        {battle.awaitingWaveStart && battle.status === 'running' && battle.nextWaveIndex < stage.waves.length ? (
          <button className="launch-fab" type="button" onClick={handleStartWave}>
            Launch wave {battle.nextWaveIndex + 1}
          </button>
        ) : null}
      </section>

      <section className="dock-sheet panel">
        {selectedPadId && !selectedPadOccupied ? (
          <>
            <div className="dock-head">
              <div>
                <p className="eyebrow">Empty Pad {selectedPadId}</p>
                <h2>Build</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedPadId(null)}>
                Close
              </button>
            </div>

            <div className="dock-build-grid">
              {TOWER_ORDER.map((typeId) => {
                const tower = getTowerDefinition(typeId);
                const baseTier = tower.tiers[0];
                const affordable = battle.credits >= baseTier.cost;

                return (
                  <button
                    className={`build-card compact-build ${affordable ? '' : 'is-disabled'}`}
                    disabled={!affordable}
                    key={tower.id}
                    type="button"
                    onClick={() => handleBuildTower(typeId)}
                  >
                    <span className="build-card-accent" style={{ background: tower.accent }} />
                    <strong>{tower.shortName}</strong>
                    <span>{baseTier.cost}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : selectedTower && selectedTowerDefinition && selectedTowerTier ? (
          <>
            <div className="dock-head">
              <div>
                <p className="eyebrow">{selectedTowerDefinition.name}</p>
                <h2>{selectedTowerTier.label}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedTowerId(null)}>
                Close
              </button>
            </div>

            <div className="mini-stat-grid compact-grid">
              <div className="detail-card compact-card">
                <strong>{Math.round(selectedTowerTier.damage)}</strong>
                <span>Damage</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{Math.round(selectedTowerTier.range)}</strong>
                <span>Range</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{selectedTowerTier.cooldown.toFixed(2)}s</strong>
                <span>Cooldown</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{selectedTowerDefinition.role}</strong>
                <span>Role</span>
              </div>
            </div>

            <div className="button-row split-row">
              <button
                className="action-button action-button--primary"
                disabled={(getUpgradeCost(selectedTower) ?? Number.POSITIVE_INFINITY) > battle.credits || selectedTower.level >= 2}
                type="button"
                onClick={handleUpgradeTower}
              >
                {selectedTower.level >= 2 ? 'Maxed' : `Upgrade ${getUpgradeCost(selectedTower)}`}
              </button>
              <button className="action-button" type="button" onClick={handleSellTower}>
                Sell {getSellValue(selectedTower)}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="dock-head dock-head--plain">
              <div>
                <p className="eyebrow">Battle Control</p>
                <h2>{battle.awaitingWaveStart ? 'Ready for launch' : 'Wave in progress'}</h2>
              </div>
            </div>
            <p className="sheet-copy dock-briefing">
              {battle.awaitingWaveStart && battle.nextWaveIndex < stage.waves.length ? stage.waves[battle.nextWaveIndex].briefing : stage.briefing}
            </p>
            <div className="mini-stat-grid compact-grid">
              <div className="detail-card compact-card">
                <strong>{battle.wavesCleared}/{stage.waves.length}</strong>
                <span>Cleared</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{starsLabel(currentStageStars)}</strong>
                <span>Rating</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{battle.towers.length}</strong>
                <span>Towers</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{battle.enemies.length}</strong>
                <span>Threats</span>
              </div>
            </div>
          </>
        )}
      </section>

      {battle.status !== 'running' ? (
        <section className="overlay-scrim">
          <article className="overlay-card panel">
            <p className="eyebrow">{battle.status === 'won' ? 'Stage cleared' : 'Reactor breached'}</p>
            <h2>{battle.status === 'won' ? stage.subtitle : 'Try another build order'}</h2>
            <p className="overlay-copy">
              {battle.status === 'won'
                ? `Factory Frontier secured with rating ${starsLabel(getStageStars(stage, battle.coreIntegrity))}.`
                : 'The reactor was overwhelmed before the final lane collapsed.'}
            </p>
            <div className="mini-stat-grid compact-grid">
              <div className="detail-card compact-card">
                <strong>{battle.coreIntegrity}/{battle.maxCoreIntegrity}</strong>
                <span>Core integrity</span>
              </div>
              <div className="detail-card compact-card">
                <strong>{battle.wavesCleared}/{stage.waves.length}</strong>
                <span>Waves cleared</span>
              </div>
            </div>
            <div className="button-row split-row">
              <button className="action-button action-button--primary" type="button" onClick={() => startStage(stage.id)}>
                Retry
              </button>
              {battle.status === 'won' && stage.id < STAGES.length ? (
                <button className="action-button" type="button" onClick={() => startStage(stage.id + 1)}>
                  Next
                </button>
              ) : null}
              <button className="action-button" type="button" onClick={openStageSelect}>
                Stages
              </button>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
