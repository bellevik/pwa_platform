import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentNetworkStatus, subscribeToNetworkStatus } from '@pwa-platform/offline';
import { FactoryBoard } from './render/FactoryBoard';
import {
  addFloor,
  addLine,
  getActiveFloor,
  getActiveLine,
  normalizeWorldState,
  placeTool,
  selectFloor,
  selectLine,
  stepWorld,
  updateMachineConfiguration
} from './game/engine';
import { applyOfflineProgress } from './game/offline';
import { DIRECTION_MARKERS, MACHINE_DEFINITIONS, rotateDirection, TOOL_ORDER } from './game/machines';
import { ASSEMBLER_RECIPES, ITEM_LABELS, SOURCE_OUTPUT_OPTIONS } from './game/recipes';
import type { AssemblerRecipeId, Direction, FactoryMachine, MegafactorySnapshot, ToolKind } from './game/types';
import { enableCloudBackup, getSnapshot, queueLocalChange, queueLocalChanges, restoreFromRecoveryCode, retryFailedOperations, saveWorld, syncWorld } from './lib/store';

const initialDirection: Direction = 'right';

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, {
  maximumFractionDigits: value >= 1000 ? 0 : 1
}).format(value);

type BottomPanel = 'none' | 'lines' | 'build' | 'inspect' | 'cloud';

export default function App() {
  const [snapshot, setSnapshot] = useState<MegafactorySnapshot | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolKind>('belt');
  const [placementDirection, setPlacementDirection] = useState<Direction>(initialDirection);
  const [selectedSourceOutputKind, setSelectedSourceOutputKind] = useState<typeof SOURCE_OUTPUT_OPTIONS[number]>('copper-coil');
  const [selectedAssemblerRecipeId, setSelectedAssemblerRecipeId] = useState<AssemblerRecipeId>('logic-board');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BottomPanel>('none');
  const [isOnline, setIsOnline] = useState<boolean>(getCurrentNetworkStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [restoreCode, setRestoreCode] = useState('');
  const worldRef = useRef<MegafactorySnapshot | null>(null);

  const refreshSnapshot = useCallback(async () => {
    const fresh = await getSnapshot();
    const normalized = {
      ...fresh,
      world: normalizeWorldState(fresh.world)
    };
    setSnapshot(normalized);
    worldRef.current = normalized;
  }, []);

  useEffect(() => {
    const syncViewportHeight = () => {
      const viewportHeight = Math.max(window.innerHeight, window.visualViewport?.height ?? 0);
      const screenHeight = Math.max(window.screen.height, window.screen.width);
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
    void (async () => {
      const nextSnapshot = await getSnapshot();
      const world = applyOfflineProgress(normalizeWorldState(nextSnapshot.world), new Date().toISOString());
      await saveWorld(world);
      const hydrated = { ...nextSnapshot, world };
      setSnapshot(hydrated);
      worldRef.current = hydrated;
    })();
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return undefined;
    }

    let lastFrame = performance.now();
    let lastPersistAt = performance.now();
    let animationFrameId = 0;

    const tick = (now: number) => {
      const current = worldRef.current;

      if (!current) {
        animationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      const deltaMs = Math.min(now - lastFrame, 120);
      lastFrame = now;
      const nextWorld = stepWorld(current.world, deltaMs);
      const nextSnapshot = {
        ...current,
        world: nextWorld
      };

      worldRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);

      if (now - lastPersistAt > 1000) {
        lastPersistAt = now;
        void saveWorld(nextWorld);
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [snapshot?.world.activeLineId]);

  useEffect(() => {
    return subscribeToNetworkStatus((nextOnline) => {
      setIsOnline(nextOnline);

      if (nextOnline) {
        void handleSync('reconnect');
        return;
      }

      setSyncMessage('Offline mode: factory changes stay local until you reconnect.');
    });
  }, [snapshot]);

  useEffect(() => {
    if (!isOnline) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void handleSync('interval');
    }, 25000);

    return () => window.clearInterval(intervalId);
  }, [isOnline, snapshot]);

  const handleSync = useCallback(async (reason: 'manual' | 'reconnect' | 'interval') => {
    const current = worldRef.current;

    if (!current) {
      return;
    }

    if (!getCurrentNetworkStatus()) {
      setSyncMessage('Offline mode: factory changes stay local until you reconnect.');
      return;
    }

    if (!current.world.profile.recoveryCode) {
      if (reason === 'manual') {
        setSyncMessage('Enable cloud backup to sync this factory.');
      }
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncWorld(current.world);
      await refreshSnapshot();
      setSyncMessage(
        result.sentOperations > 0
          ? `Synced ${result.sentOperations} queued factory change${result.sentOperations === 1 ? '' : 's'}.`
          : 'Factory backup is up to date.'
      );
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  }, [refreshSnapshot]);

  const activeLine = useMemo(() => (snapshot ? getActiveLine(snapshot.world) : null), [snapshot]);
  const activeFloor = useMemo(() => (snapshot ? getActiveFloor(snapshot.world) : null), [snapshot]);
  const selectedMachine = useMemo<FactoryMachine | null>(() => {
    if (!activeFloor || !selectedMachineId) {
      return null;
    }

    return activeFloor.machines.find((machine) => machine.id === selectedMachineId) ?? null;
  }, [activeFloor, selectedMachineId]);

  const commitBuildResult = useCallback(async (result: {
    world: MegafactorySnapshot['world'];
    operation: ReturnType<typeof placeTool>['operation'];
    message?: string;
  }) => {
    if (!result.operation) {
      if (result.message) {
        setSyncMessage(result.message);
      }
      return;
    }

    await queueLocalChange(result.world, result.operation);
    await refreshSnapshot();
  }, [refreshSnapshot]);

  const handleBoardInteract = async (x: number, y: number) => {
    if (!snapshot) {
      return;
    }

    const machineAtCell = activeFloor?.machines.find((machine) => machine.x === x && machine.y === y) ?? null;

    if (machineAtCell && selectedTool !== 'erase') {
      setSelectedMachineId(machineAtCell.id);
      setActivePanel('inspect');
      setSyncMessage(`${MACHINE_DEFINITIONS[machineAtCell.kind].label} selected for tuning.`);
      return;
    }

    setSelectedMachineId(null);
    if (selectedTool !== 'erase') {
      setActivePanel('build');
    }

    await commitBuildResult(placeTool(snapshot.world, selectedTool, placementDirection, x, y, {
      sourceOutputKind: selectedSourceOutputKind,
      assemblerRecipeId: selectedAssemblerRecipeId
    }));
  };

  const handleDragPath = async (cells: Array<{ x: number; y: number }>) => {
    if (!snapshot) {
      return;
    }

    let world = snapshot.world;
    const operations = [] as NonNullable<ReturnType<typeof placeTool>['operation']>[];
    let latestMessage: string | undefined;

    for (const cell of cells) {
      const result = placeTool(world, selectedTool, placementDirection, cell.x, cell.y, {
        sourceOutputKind: selectedSourceOutputKind,
        assemblerRecipeId: selectedAssemblerRecipeId
      });

      world = result.world;

      if (result.operation) {
        operations.push(result.operation);
      }

      if (result.message) {
        latestMessage = result.message;
      }
    }

    setSelectedMachineId(null);
    setActivePanel(selectedTool === 'erase' ? 'none' : 'build');

    if (operations.length === 0) {
      if (latestMessage) {
        setSyncMessage(latestMessage);
      }
      return;
    }

    await queueLocalChanges(world, operations);
    await refreshSnapshot();
    setSyncMessage(
      selectedTool === 'erase'
        ? `Cleared ${operations.length} tile${operations.length === 1 ? '' : 's'}.`
        : `Laid ${operations.length} ${selectedTool === 'belt' ? 'conveyor' : 'machine'} tile${operations.length === 1 ? '' : 's'}.`
    );
  };

  const handleMachineUpdate = async (changes: Partial<Pick<FactoryMachine, 'direction' | 'outputKind' | 'recipeId' | 'routeIndex'>>) => {
    if (!snapshot || !selectedMachine) {
      return;
    }

    await commitBuildResult(updateMachineConfiguration(snapshot.world, selectedMachine.id, changes));
  };

  const handleEnableBackup = async () => {
    if (!snapshot) {
      return;
    }

    try {
      await enableCloudBackup(snapshot.world);
      await refreshSnapshot();
      setSyncMessage('Cloud backup is live. Save your recovery code somewhere safe.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Could not enable backup.');
    }
  };

  const handleRestore = async () => {
    if (!restoreCode.trim()) {
      setSyncMessage('Enter a recovery code first.');
      return;
    }

    try {
      await restoreFromRecoveryCode(restoreCode.trim().toUpperCase());
      await refreshSnapshot();
      setActivePanel('cloud');
      setSyncMessage('Factory restored from cloud backup.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Restore failed.');
    }
  };

  const handleRetryFailed = async () => {
    await retryFailedOperations();
    await refreshSnapshot();
    setSyncMessage('Failed operations moved back to the queue.');
  };

  if (!snapshot || !activeFloor || !activeLine) {
    return <main className="loading-shell">Booting factory...</main>;
  }

  const recoveryCode = snapshot.world.profile.recoveryCode;
  const profitPerMinute = activeFloor.stats.lastMinuteRevenue;
  const liveItemSummary = Object.entries(
    activeFloor.items.reduce<Record<string, number>>((counts, item) => {
      counts[item.kind] = (counts[item.kind] ?? 0) + 1;
      return counts;
    }, {})
  );
  const selectedRecipe = ASSEMBLER_RECIPES[selectedAssemblerRecipeId];

  return (
    <main className="factory-app">
      <section className="board-panel">
        <FactoryBoard
          floor={activeFloor}
          onDragPath={handleDragPath}
          onInteract={handleBoardInteract}
          placementDirection={placementDirection}
          selectedTool={selectedTool}
          selectedMachineId={selectedMachineId}
        />
      </section>

      <button className="hud-mini-button hud-mini-button--left" onClick={() => setActivePanel('lines')} type="button">
        <span>LIN</span>
      </button>

      <header className="hud-cashbar">
        <strong>{formatCurrency(snapshot.world.profile.cash)}</strong>
        <span>{formatCurrency(profitPerMinute)}/min</span>
      </header>

      <button className="hud-mini-button hud-mini-button--right" onClick={() => setActivePanel('cloud')} type="button">
        <span>{isOnline ? 'SAV' : 'OFF'}</span>
      </button>

      {activePanel !== 'none' ? (
        <section className="control-sheet panel">
          <div className="sheet-handle" />
          <div className="panel-tabs">
          {([
            ['lines', 'Lines'],
            ['build', 'Build'],
            ['inspect', 'Inspect'],
            ['cloud', 'Cloud']
          ] as const).map(([panel, label]) => (
            <button
              className={`panel-tab ${activePanel === panel ? 'panel-tab--active' : ''}`}
              key={panel}
              onClick={() => setActivePanel(panel)}
              type="button"
            >
              {label}
            </button>
          ))}
            <button className="panel-tab panel-tab--close" onClick={() => setActivePanel('none')} type="button">Close</button>
          </div>

          {activePanel === 'lines' ? (
          <div className="tab-body">
            <div className="strip-header">
              <div>
                <p className="eyebrow">Production Lines</p>
                <strong>{activeLine.name}</strong>
              </div>
              <button className="ghost-button" onClick={() => void commitBuildResult(addLine(snapshot.world))} type="button">+ Line</button>
            </div>
            <div className="chip-row">
              {snapshot.world.lines.map((line) => (
                <button className={`chip ${line.id === activeLine.id ? 'chip--active' : ''}`} key={line.id} onClick={() => void commitBuildResult(selectLine(snapshot.world, line.id))} type="button">{line.name}</button>
              ))}
            </div>
            <div className="strip-header strip-header--secondary">
              <div>
                <p className="eyebrow">Floors</p>
                <strong>{activeFloor.name}</strong>
              </div>
              <button className="ghost-button" onClick={() => void commitBuildResult(addFloor(snapshot.world))} type="button">+ Floor</button>
            </div>
            <div className="chip-row">
              {activeLine.floors.map((floor) => (
                <button className={`chip ${floor.id === activeFloor.id ? 'chip--active' : ''}`} key={floor.id} onClick={() => void commitBuildResult(selectFloor(snapshot.world, floor.id))} type="button">{floor.name}</button>
              ))}
            </div>
            <div className="chip-row">
              {liveItemSummary.length > 0 ? liveItemSummary.map(([kind, count]) => (
                <span className="chip chip--summary" key={kind}>{ITEM_LABELS[kind as keyof typeof ITEM_LABELS]} x {count}</span>
              )) : <span className="chip chip--summary">No belt items yet</span>}
            </div>
            <div className="chip-row">
              <span className="chip chip--summary">{activeFloor.width}x{activeFloor.height} grid</span>
              <span className="chip chip--summary">{formatCurrency(profitPerMinute)}/min</span>
              <span className="chip chip--summary">{snapshot.world.profile.totalDevicesShipped} shipped</span>
            </div>
          </div>
        ) : null}

          {activePanel === 'build' ? (
            <div className="tab-body">
            <div className="toolbar-row">
              {TOOL_ORDER.map((tool) => (
                <button className={`tool-button ${selectedTool === tool ? 'tool-button--active' : ''}`} key={tool} onClick={() => setSelectedTool(tool)} type="button">
                  <strong>{tool === 'erase' ? 'DEL' : MACHINE_DEFINITIONS[tool].shortLabel}</strong>
                  <span>{tool === 'erase' ? 'Erase' : MACHINE_DEFINITIONS[tool].label}</span>
                </button>
              ))}
            </div>
            <div className="toolbar-row toolbar-row--meta">
              <button className="meta-button" onClick={() => setPlacementDirection((direction) => rotateDirection(direction))} type="button">Rotate {DIRECTION_MARKERS[placementDirection]}</button>
              <button className="meta-button" onClick={() => setActivePanel('inspect')} type="button">Inspect</button>
            </div>
            <div className="config-panel">
              <div>
                <p className="eyebrow">Build Config</p>
                <strong>
                  {selectedTool === 'source'
                    ? `Source output: ${ITEM_LABELS[selectedSourceOutputKind]}`
                    : selectedTool === 'assembler'
                      ? `Assembler recipe: ${selectedRecipe.label}`
                      : selectedTool === 'erase'
                        ? 'Erase machines and moving items from a tile.'
                        : `${MACHINE_DEFINITIONS[selectedTool].label} placement`}
                </strong>
                <p className="config-hint">
                  {(selectedTool === 'belt' || selectedTool === 'erase')
                    ? 'Drag across the grid to paint a path in one gesture.'
                    : 'Tap a tile to place, or tap an existing machine to inspect it.'}
                </p>
              </div>
              {selectedTool === 'source' ? (
                <div className="chip-row">
                  {SOURCE_OUTPUT_OPTIONS.map((itemKind) => (
                    <button className={`chip ${selectedSourceOutputKind === itemKind ? 'chip--active' : ''}`} key={itemKind} onClick={() => setSelectedSourceOutputKind(itemKind)} type="button">{ITEM_LABELS[itemKind]}</button>
                  ))}
                </div>
              ) : null}
              {selectedTool === 'assembler' ? (
                <div className="recipe-stack">
                  {Object.entries(ASSEMBLER_RECIPES).map(([recipeId, recipe]) => (
                    <button className={`recipe-card ${selectedAssemblerRecipeId === recipeId ? 'recipe-card--active' : ''}`} key={recipeId} onClick={() => setSelectedAssemblerRecipeId(recipeId as AssemblerRecipeId)} type="button">
                      <strong>{recipe.label}</strong>
                      <span>{recipe.inputKinds.map((kind) => ITEM_LABELS[kind]).join(' + ')} {'->'} {ITEM_LABELS[recipe.outputKind]}</span>
                      <span>{recipe.blurb}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            </div>
          ) : null}

          {activePanel === 'inspect' ? (
            <div className="tab-body">
            {selectedMachine ? (
              <>
                <div className="sheet-header">
                  <div>
                    <p className="eyebrow">Machine Inspector</p>
                    <strong>{MACHINE_DEFINITIONS[selectedMachine.kind].label}</strong>
                  </div>
                  <button className="ghost-button" onClick={() => setSelectedMachineId(null)} type="button">Done</button>
                </div>
                <div className="inspector-meta">
                  <span className="chip chip--summary">Tile {selectedMachine.x + 1},{selectedMachine.y + 1}</span>
                  <span className="chip chip--summary">Facing {DIRECTION_MARKERS[selectedMachine.direction]}</span>
                </div>
                <div className="toolbar-row toolbar-row--meta">
                  <button className="meta-button" onClick={() => void handleMachineUpdate({ direction: rotateDirection(selectedMachine.direction) })} type="button">Rotate Machine</button>
                </div>
                {selectedMachine.kind === 'source' ? (
                  <div className="recipe-stack">
                    <strong>Output Material</strong>
                    <div className="chip-row">
                      {SOURCE_OUTPUT_OPTIONS.map((itemKind) => (
                        <button className={`chip ${selectedMachine.outputKind === itemKind ? 'chip--active' : ''}`} key={itemKind} onClick={() => void handleMachineUpdate({ outputKind: itemKind })} type="button">{ITEM_LABELS[itemKind]}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedMachine.kind === 'assembler' ? (
                  <div className="recipe-stack">
                    <strong>Assembly Recipe</strong>
                    {Object.entries(ASSEMBLER_RECIPES).map(([recipeId, recipe]) => (
                      <button className={`recipe-card ${selectedMachine.recipeId === recipeId ? 'recipe-card--active' : ''}`} key={recipeId} onClick={() => void handleMachineUpdate({ recipeId: recipeId as AssemblerRecipeId })} type="button">
                        <strong>{recipe.label}</strong>
                        <span>{recipe.inputKinds.map((kind) => ITEM_LABELS[kind]).join(' + ')} {'->'} {ITEM_LABELS[recipe.outputKind]}</span>
                        <span>{recipe.blurb}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {selectedMachine.kind === 'splitter' ? (
                  <div className="recipe-stack">
                    <strong>Route Bias</strong>
                    <div className="chip-row">
                      <button className={`chip ${(selectedMachine.routeIndex ?? 0) % 2 === 0 ? 'chip--active' : ''}`} onClick={() => void handleMachineUpdate({ routeIndex: 0 })} type="button">Forward First</button>
                      <button className={`chip ${(selectedMachine.routeIndex ?? 0) % 2 === 1 ? 'chip--active' : ''}`} onClick={() => void handleMachineUpdate({ routeIndex: 1 })} type="button">Side First</button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-tab-state">
                <strong>No machine selected</strong>
                <p>Tap any placed machine on the grid to inspect and retune it here.</p>
              </div>
            )}
            </div>
          ) : null}

          {activePanel === 'cloud' ? (
            <div className="tab-body">
            <div className="toolbar-row toolbar-row--meta">
              <button className="meta-button" disabled={isSyncing} onClick={() => void handleSync('manual')} type="button">{isSyncing ? 'Syncing...' : 'Sync Now'}</button>
              <button className="meta-button" onClick={handleRetryFailed} type="button">Retry Failed</button>
            </div>
            <div className="status-strip status-strip--panel">
              <span className={`status-pill ${isOnline ? 'status-pill--online' : 'status-pill--offline'}`}>{isOnline ? 'Online' : 'Offline'}</span>
              <span className="status-pill">Queued {snapshot.pendingCount}</span>
              <span className="status-pill">Server v{snapshot.serverVersion}</span>
            </div>
            {recoveryCode ? (
              <div className="cloud-code">
                <span>Recovery code</span>
                <strong>{recoveryCode}</strong>
                <p>Save this outside the app so you can restore the factory on another device.</p>
              </div>
            ) : (
              <div className="cloud-code cloud-code--empty">
                <p>No backup is enabled yet.</p>
                <button className="primary-button" onClick={handleEnableBackup} type="button">Enable Cloud Backup</button>
              </div>
            )}
            <div className="restore-block">
              <label htmlFor="restore-code">Restore from recovery code</label>
              <input id="restore-code" onChange={(event) => setRestoreCode(event.target.value.toUpperCase())} placeholder="MGF-XXXX-XXXX-XXXX" value={restoreCode} />
              <button className="ghost-button ghost-button--solid" onClick={handleRestore} type="button">Restore Backup</button>
            </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <nav className="fab-dock" aria-label="Factory controls">
        <button className={`fab-button ${activePanel === 'build' ? 'fab-button--active' : ''}`} onClick={() => setActivePanel(activePanel === 'build' ? 'none' : 'build')} type="button">
          <span className="fab-button__icon">BLD</span>
          <span className="fab-button__label">Build</span>
        </button>
        <button className={`fab-button ${activePanel === 'lines' ? 'fab-button--active' : ''}`} onClick={() => setActivePanel(activePanel === 'lines' ? 'none' : 'lines')} type="button">
          <span className="fab-button__icon">LIN</span>
          <span className="fab-button__label">Lines</span>
        </button>
        <button className={`fab-button ${activePanel === 'inspect' ? 'fab-button--active' : ''}`} onClick={() => setActivePanel(activePanel === 'inspect' ? 'none' : 'inspect')} type="button">
          <span className="fab-button__icon">SEL</span>
          <span className="fab-button__label">Inspect</span>
        </button>
        <button className={`fab-button ${activePanel === 'cloud' ? 'fab-button--active' : ''}`} onClick={() => setActivePanel(activePanel === 'cloud' ? 'none' : 'cloud')} type="button">
          <span className="fab-button__icon">SAV</span>
          <span className="fab-button__label">Cloud</span>
        </button>
      </nav>

      {syncMessage ? <section className="notice">{syncMessage}</section> : null}
    </main>
  );
}
