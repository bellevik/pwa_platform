import { createUuid } from '@pwa-platform/offline';
import {
  ASSEMBLER_CYCLE_MS,
  DIRECTION_VECTORS,
  ITEM_TILES_PER_SECOND,
  ITEM_VALUES,
  MACHINE_DEFINITIONS,
  SOURCE_CYCLE_MS,
  TILE_TRANSFER_EPSILON,
  toCellKey
} from './machines';
import { ASSEMBLER_RECIPES } from './recipes';
import type {
  AssemblerRecipeId,
  ConveyorItem,
  Direction,
  FactoryFloor,
  FactoryMachine,
  ItemKind,
  MegafactoryOperation,
  MegafactoryState,
  ProductionLine,
  ToolKind
} from './types';

type BuildResult = {
  world: MegafactoryState;
  operation: MegafactoryOperation | null;
  message?: string;
};

export type BuildPlacementOptions = {
  sourceOutputKind: Extract<ItemKind, 'copper-coil' | 'glass-panel'>;
  assemblerRecipeId: AssemblerRecipeId;
};

type DeliveryResult = {
  accepted: boolean;
  cashDelta: number;
  shippedDelta: number;
};

export function createInitialWorld(): MegafactoryState {
  const timestamp = new Date().toISOString();
  const firstLine = createLine('Starter Line', true);

  return {
    schemaVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSimulatedAt: timestamp,
    activeLineId: firstLine.id,
    profile: {
      cash: 980,
      lifetimeCash: 980,
      totalDevicesShipped: 0,
      cloudEnabled: false,
      recoveryCode: null
    },
    lines: [firstLine]
  };
}

export function normalizeWorldState(world: MegafactoryState): MegafactoryState {
  return {
    ...world,
    lines: world.lines.map((line) => ({
      ...line,
      floors: line.floors.map((floor) => ({
        ...floor,
        machines: floor.machines.map(normalizeMachine),
        items: floor.items.map((item) => ({ ...item }))
      }))
    }))
  };
}

export function stepWorld(inputWorld: MegafactoryState, deltaMs: number): MegafactoryState {
  if (deltaMs <= 0 || deltaMs > 300) {
    return inputWorld;
  }

  const world = normalizeWorldState(inputWorld);
  const lineIndex = world.lines.findIndex((line) => line.id === world.activeLineId);

  if (lineIndex === -1) {
    return world;
  }

  const activeLine = world.lines[lineIndex];
  const floorIndex = activeLine.floors.findIndex((floor) => floor.id === activeLine.activeFloorId);

  if (floorIndex === -1) {
    return world;
  }

  const floor = activeLine.floors[floorIndex];
  const inactiveRevenuePerMinute = world.lines.reduce((sum, line) => {
    return sum + line.floors.reduce((floorSum, candidateFloor) => {
      const isActiveFloor = line.id === activeLine.id && candidateFloor.id === floor.id;
      return floorSum + (isActiveFloor ? 0 : candidateFloor.stats.lastMinuteRevenue);
    }, 0);
  }, 0);

  const nextMachines = floor.machines.map((machine) => normalizeMachine(machine));
  const nextMachinesByCell = new Map(nextMachines.map((machine) => [toCellKey(machine.x, machine.y), machine]));
  const occupancy = new Map(floor.items.map((item) => [toCellKey(item.x, item.y), item.id]));
  const spawnedItems: ConveyorItem[] = [];
  let cashDelta = inactiveRevenuePerMinute * (deltaMs / 60000);
  let shippedDelta = 0;

  for (const machine of nextMachines) {
    if (machine.kind !== 'source') {
      continue;
    }

    const nextProgress = (machine.spawnProgressMs ?? 0) + deltaMs;
    machine.spawnProgressMs = nextProgress;

    if (nextProgress < SOURCE_CYCLE_MS) {
      continue;
    }

    const vector = DIRECTION_VECTORS[machine.direction];
    const targetX = machine.x + vector.x;
    const targetY = machine.y + vector.y;
    const targetMachine = nextMachinesByCell.get(toCellKey(targetX, targetY));
    const outputKind = machine.outputKind ?? 'copper-coil';

    if (!targetMachine) {
      machine.spawnProgressMs = SOURCE_CYCLE_MS;
      continue;
    }

    const delivery = deliverItemToMachine({
      itemKind: outputKind,
      targetMachine,
      targetX,
      targetY,
      occupancy,
      spawnedItems
    });

    if (!delivery.accepted) {
      machine.spawnProgressMs = SOURCE_CYCLE_MS;
      continue;
    }

    machine.spawnProgressMs = Math.max(0, nextProgress - SOURCE_CYCLE_MS);
    cashDelta += delivery.cashDelta;
    shippedDelta += delivery.shippedDelta;
  }

  for (const machine of nextMachines) {
    if (machine.kind !== 'assembler') {
      continue;
    }

    const recipeId = machine.recipeId ?? 'logic-board';
    const recipe = ASSEMBLER_RECIPES[recipeId];

    if (!hasRequiredInputs(machine, recipe.inputKinds)) {
      machine.craftProgressMs = 0;
      continue;
    }

    const nextProgress = (machine.craftProgressMs ?? 0) + deltaMs;
    machine.craftProgressMs = nextProgress;

    if (nextProgress < ASSEMBLER_CYCLE_MS) {
      continue;
    }

    const vector = DIRECTION_VECTORS[machine.direction];
    const targetX = machine.x + vector.x;
    const targetY = machine.y + vector.y;
    const targetMachine = nextMachinesByCell.get(toCellKey(targetX, targetY));

    if (!targetMachine) {
      machine.craftProgressMs = ASSEMBLER_CYCLE_MS;
      continue;
    }

    const delivery = deliverItemToMachine({
      itemKind: recipe.outputKind,
      targetMachine,
      targetX,
      targetY,
      occupancy,
      spawnedItems
    });

    if (!delivery.accepted) {
      machine.craftProgressMs = ASSEMBLER_CYCLE_MS;
      continue;
    }

    machine.bufferedItems = removeRequiredInputs(machine, recipe.inputKinds);
    machine.craftProgressMs = 0;
    cashDelta += delivery.cashDelta;
    shippedDelta += delivery.shippedDelta;
  }

  const remainingItems: ConveyorItem[] = [];
  const itemsInMotion = [...floor.items, ...spawnedItems]
    .map((item) => ({ ...item, ageMs: item.ageMs + deltaMs }))
    .sort((left, right) => right.progress - left.progress || left.ageMs - right.ageMs);

  for (const item of itemsInMotion) {
    const currentMachine = nextMachinesByCell.get(toCellKey(item.x, item.y));

    if (!currentMachine || (currentMachine.kind !== 'belt' && currentMachine.kind !== 'splitter')) {
      continue;
    }

    const nextProgress = item.progress + (ITEM_TILES_PER_SECOND * deltaMs) / 1000;

    if (nextProgress < 1) {
      item.progress = nextProgress;
      remainingItems.push(item);
      continue;
    }

    const outputTargets = getOutputTargets(currentMachine, item.x, item.y);
    let delivered = false;

    for (const target of outputTargets) {
      const targetMachine = nextMachinesByCell.get(toCellKey(target.x, target.y));

      if (!targetMachine) {
        continue;
      }

      const currentCellKey = toCellKey(item.x, item.y);
      const targetCellKey = toCellKey(target.x, target.y);

      if ((targetMachine.kind === 'belt' || targetMachine.kind === 'splitter')
        && occupancy.has(targetCellKey)
        && occupancy.get(targetCellKey) !== item.id) {
        continue;
      }

      const delivery = deliverItemToMachine({
        itemKind: item.kind,
        targetMachine,
        targetX: target.x,
        targetY: target.y,
        occupancy,
        spawnedItems,
        currentCellKey
      });

      if (!delivery.accepted) {
        continue;
      }

      if (currentMachine.kind === 'splitter') {
        currentMachine.routeIndex = ((currentMachine.routeIndex ?? 0) + 1) % 2;
      }

      cashDelta += delivery.cashDelta;
      shippedDelta += delivery.shippedDelta;
      delivered = true;
      break;
    }

    if (!delivered) {
      item.progress = TILE_TRANSFER_EPSILON;
      remainingItems.push(item);
    }
  }

  const updatedFloor: FactoryFloor = {
    ...floor,
    machines: nextMachines,
    items: remainingItems,
    stats: {
      itemsShipped: floor.stats.itemsShipped + shippedDelta,
      activeItems: remainingItems.length,
      lastMinuteRevenue: smoothRevenue(
        floor.stats.lastMinuteRevenue,
        cashDelta - inactiveRevenuePerMinute * (deltaMs / 60000),
        deltaMs
      )
    }
  };

  const updatedLine: ProductionLine = {
    ...activeLine,
    floors: activeLine.floors.map((candidate, candidateIndex) => (
      candidateIndex === floorIndex ? updatedFloor : candidate
    ))
  };

  const timestamp = new Date().toISOString();
  return {
    ...world,
    updatedAt: timestamp,
    lastSimulatedAt: timestamp,
    profile: {
      ...world.profile,
      cash: world.profile.cash + cashDelta,
      lifetimeCash: world.profile.lifetimeCash + cashDelta,
      totalDevicesShipped: world.profile.totalDevicesShipped + shippedDelta
    },
    lines: world.lines.map((line, candidateIndex) => (
      candidateIndex === lineIndex ? updatedLine : line
    ))
  };
}

export function placeTool(
  inputWorld: MegafactoryState,
  tool: ToolKind,
  direction: Direction,
  x: number,
  y: number,
  options: BuildPlacementOptions
): BuildResult {
  const world = normalizeWorldState(inputWorld);

  if (tool === 'erase') {
    return deleteMachine(world, x, y);
  }

  const floor = getActiveFloor(world);

  if (!floor || !isInsideFloor(floor, x, y)) {
    return { world, operation: null };
  }

  const existing = floor.machines.find((machine) => machine.x === x && machine.y === y);
  const nextMachine = buildMachineDefinition(existing?.id ?? createUuid(), tool, x, y, direction, options, existing);

  if (existing && machinesMatch(existing, nextMachine)) {
    return { world, operation: null };
  }

  const cost = existing?.kind === tool ? 0 : MACHINE_DEFINITIONS[tool].cost;

  if (world.profile.cash < cost) {
    return { world, operation: null, message: 'Not enough credits for that build.' };
  }

  const line = getActiveLine(world);

  if (!line) {
    return { world, operation: null };
  }

  const nextWorld = updateActiveFloor(world, (floorToUpdate) => ({
    ...floorToUpdate,
    machines: floorToUpdate.machines
      .filter((machine) => machine.x !== x || machine.y !== y)
      .concat(nextMachine)
      .sort((left, right) => left.y - right.y || left.x - right.x)
  }), -cost);

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: nextMachine.id,
      type: existing ? 'machine_rotate' : 'machine_place',
      payload: {
        lineId: line.id,
        floorId: line.activeFloorId,
        machine: nextMachine,
        x,
        y,
        direction
      },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

export function addLine(inputWorld: MegafactoryState): BuildResult {
  const world = normalizeWorldState(inputWorld);
  const cost = 640;

  if (world.profile.cash < cost) {
    return { world, operation: null, message: 'You need more credits for a new line.' };
  }

  const nextLine = createLine(`Line ${world.lines.length + 1}`, false);
  const nextWorld: MegafactoryState = {
    ...world,
    updatedAt: new Date().toISOString(),
    profile: {
      ...world.profile,
      cash: world.profile.cash - cost
    },
    activeLineId: nextLine.id,
    lines: [...world.lines, nextLine]
  };

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: nextLine.id,
      type: 'line_create',
      payload: {
        lineId: nextLine.id,
        name: nextLine.name
      },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

export function addFloor(inputWorld: MegafactoryState): BuildResult {
  const world = normalizeWorldState(inputWorld);
  const line = getActiveLine(world);

  if (!line) {
    return { world, operation: null };
  }

  const cost = 920 * (line.floors.length + 1);

  if (world.profile.cash < cost) {
    return { world, operation: null, message: 'You need more credits for another floor.' };
  }

  const nextFloor = createFloor(line.floors.length + 1, false);
  const nextWorld: MegafactoryState = {
    ...world,
    updatedAt: new Date().toISOString(),
    profile: {
      ...world.profile,
      cash: world.profile.cash - cost
    },
    lines: world.lines.map((candidate) => (
      candidate.id === line.id
        ? { ...candidate, activeFloorId: nextFloor.id, floors: [...candidate.floors, nextFloor] }
        : candidate
    ))
  };

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: nextFloor.id,
      type: 'floor_create',
      payload: {
        lineId: line.id,
        floorId: nextFloor.id,
        name: nextFloor.name
      },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

export function selectLine(inputWorld: MegafactoryState, lineId: string): BuildResult {
  const world = normalizeWorldState(inputWorld);

  if (world.activeLineId === lineId) {
    return { world, operation: null };
  }

  const target = world.lines.find((line) => line.id === lineId);

  if (!target) {
    return { world, operation: null };
  }

  const nextWorld = {
    ...world,
    updatedAt: new Date().toISOString(),
    activeLineId: lineId
  };

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: lineId,
      type: 'line_select',
      payload: { lineId },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

export function selectFloor(inputWorld: MegafactoryState, floorId: string): BuildResult {
  const world = normalizeWorldState(inputWorld);
  const line = getActiveLine(world);

  if (!line || line.activeFloorId === floorId) {
    return { world, operation: null };
  }

  const nextWorld: MegafactoryState = {
    ...world,
    updatedAt: new Date().toISOString(),
    lines: world.lines.map((candidate) => (
      candidate.id === line.id ? { ...candidate, activeFloorId: floorId } : candidate
    ))
  };

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: floorId,
      type: 'floor_select',
      payload: {
        lineId: line.id,
        floorId
      },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

export function updateMachineConfiguration(
  inputWorld: MegafactoryState,
  machineId: string,
  changes: Partial<Pick<FactoryMachine, 'direction' | 'outputKind' | 'recipeId' | 'routeIndex'>>
): BuildResult {
  const world = normalizeWorldState(inputWorld);
  const line = getActiveLine(world);
  const floor = getActiveFloor(world);

  if (!line || !floor) {
    return { world, operation: null };
  }

  const existing = floor.machines.find((machine) => machine.id === machineId);

  if (!existing) {
    return { world, operation: null };
  }

  const nextMachine = normalizeMachine({
    ...existing,
    ...changes
  });

  if (machinesMatch(existing, nextMachine) && existing.routeIndex === nextMachine.routeIndex) {
    return { world, operation: null };
  }

  const nextWorld = updateActiveFloor(world, (floorToUpdate) => ({
    ...floorToUpdate,
    machines: floorToUpdate.machines.map((machine) => (
      machine.id === machineId ? nextMachine : machine
    ))
  }));

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: machineId,
      type: 'machine_configure',
      payload: {
        lineId: line.id,
        floorId: line.activeFloorId,
        machine: nextMachine,
        direction: nextMachine.direction
      },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

export function getActiveLine(world: MegafactoryState): ProductionLine | null {
  return world.lines.find((line) => line.id === world.activeLineId) ?? null;
}

export function getActiveFloor(world: MegafactoryState): FactoryFloor | null {
  const line = getActiveLine(world);
  return line ? line.floors.find((floor) => floor.id === line.activeFloorId) ?? null : null;
}

function deleteMachine(world: MegafactoryState, x: number, y: number): BuildResult {
  const line = getActiveLine(world);
  const floor = getActiveFloor(world);

  if (!line || !floor) {
    return { world, operation: null };
  }

  const existing = floor.machines.find((machine) => machine.x === x && machine.y === y);

  if (!existing) {
    return { world, operation: null };
  }

  const nextWorld = updateActiveFloor(world, (floorToUpdate) => ({
    ...floorToUpdate,
    machines: floorToUpdate.machines.filter((machine) => machine.x !== x || machine.y !== y),
    items: floorToUpdate.items.filter((item) => item.x !== x || item.y !== y)
  }));

  return {
    world: nextWorld,
    operation: {
      id: createUuid(),
      entityId: existing.id,
      type: 'machine_delete',
      payload: {
        lineId: line.id,
        floorId: line.activeFloorId,
        machineId: existing.id,
        x,
        y
      },
      clientTimestamp: nextWorld.updatedAt,
      deviceId: 'pending-local-device',
      status: 'pending'
    }
  };
}

function updateActiveFloor(
  world: MegafactoryState,
  updater: (floor: FactoryFloor) => FactoryFloor,
  cashDelta = 0
): MegafactoryState {
  return {
    ...world,
    updatedAt: new Date().toISOString(),
    profile: {
      ...world.profile,
      cash: world.profile.cash + cashDelta
    },
    lines: world.lines.map((line) => (
      line.id === world.activeLineId
        ? { ...line, floors: line.floors.map((floor) => floor.id === line.activeFloorId ? updater(floor) : floor) }
        : line
    ))
  };
}

function createLine(name: string, seeded: boolean): ProductionLine {
  const floor = createFloor(1, seeded);

  return {
    id: createUuid(),
    name,
    activeFloorId: floor.id,
    floors: [floor]
  };
}

function createFloor(level: number, seeded: boolean): FactoryFloor {
  const floor: FactoryFloor = {
    id: createUuid(),
    name: `Floor ${level}`,
    level,
    width: 10,
    height: 12,
    machines: [],
    items: [],
    stats: {
      itemsShipped: 0,
      lastMinuteRevenue: 0,
      activeItems: 0
    }
  };

  if (!seeded) {
    return floor;
  }

  floor.machines = [
    buildMachineDefinition(createUuid(), 'source', 1, 2, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 2, 2, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'splitter', 3, 2, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 4, 2, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'seller', 5, 2, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 3, 3, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'assembler', 4, 3, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 5, 3, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 6, 3, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 7, 3, 'down', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 7, 4, 'down', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'assembler', 7, 5, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'pocket-console' }),
    buildMachineDefinition(createUuid(), 'belt', 8, 5, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'seller', 9, 5, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),

    buildMachineDefinition(createUuid(), 'source', 1, 8, 'right', { sourceOutputKind: 'glass-panel', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 2, 8, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'assembler', 3, 8, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'display-module' }),
    buildMachineDefinition(createUuid(), 'belt', 4, 8, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 5, 8, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 6, 8, 'right', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 7, 8, 'up', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 7, 7, 'up', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' }),
    buildMachineDefinition(createUuid(), 'belt', 7, 6, 'up', { sourceOutputKind: 'copper-coil', assemblerRecipeId: 'logic-board' })
  ];

  return floor;
}

function buildMachineDefinition(
  id: string,
  tool: Exclude<ToolKind, 'erase'>,
  x: number,
  y: number,
  direction: Direction,
  options: BuildPlacementOptions,
  existing?: FactoryMachine
): FactoryMachine {
  if (tool === 'source') {
    return {
      id,
      kind: 'source',
      x,
      y,
      direction,
      spawnProgressMs: existing?.spawnProgressMs ?? 0,
      outputKind: options.sourceOutputKind
    };
  }

  if (tool === 'assembler') {
    return {
      id,
      kind: 'assembler',
      x,
      y,
      direction,
      craftProgressMs: existing?.craftProgressMs ?? 0,
      bufferedItems: existing?.bufferedItems ? [...existing.bufferedItems] : [],
      recipeId: options.assemblerRecipeId
    };
  }

  if (tool === 'splitter') {
    return {
      id,
      kind: 'splitter',
      x,
      y,
      direction,
      routeIndex: existing?.routeIndex ?? 0
    };
  }

  return {
    id,
    kind: tool,
    x,
    y,
    direction
  };
}

function normalizeMachine(machine: FactoryMachine): FactoryMachine {
  const legacy = machine as FactoryMachine & { bufferedItemKind?: ItemKind | null };

  if (machine.kind === 'source') {
    return {
      ...machine,
      spawnProgressMs: machine.spawnProgressMs ?? 0,
      outputKind: machine.outputKind ?? 'copper-coil'
    };
  }

  if (machine.kind === 'assembler') {
    const bufferedItems = machine.bufferedItems ?? (legacy.bufferedItemKind ? [legacy.bufferedItemKind] : []);
    return {
      ...machine,
      craftProgressMs: machine.craftProgressMs ?? 0,
      bufferedItems: [...bufferedItems],
      recipeId: machine.recipeId ?? 'logic-board'
    };
  }

  if (machine.kind === 'splitter') {
    return {
      ...machine,
      routeIndex: machine.routeIndex ?? 0
    };
  }

  return { ...machine };
}

function deliverItemToMachine(options: {
  itemKind: ItemKind;
  targetMachine: FactoryMachine;
  targetX: number;
  targetY: number;
  occupancy: Map<string, string>;
  spawnedItems: ConveyorItem[];
  currentCellKey?: string;
}): DeliveryResult {
  const { itemKind, targetMachine, targetX, targetY, occupancy, spawnedItems, currentCellKey } = options;

  if (targetMachine.kind === 'seller') {
    if (currentCellKey) {
      occupancy.delete(currentCellKey);
    }
    return {
      accepted: true,
      cashDelta: ITEM_VALUES[itemKind],
      shippedDelta: 1
    };
  }

  if (targetMachine.kind === 'assembler') {
    if (!canAcceptInput(targetMachine, itemKind)) {
      return { accepted: false, cashDelta: 0, shippedDelta: 0 };
    }

    targetMachine.bufferedItems = [...(targetMachine.bufferedItems ?? []), itemKind];
    targetMachine.craftProgressMs = 0;
    if (currentCellKey) {
      occupancy.delete(currentCellKey);
    }
    return { accepted: true, cashDelta: 0, shippedDelta: 0 };
  }

  if (targetMachine.kind !== 'belt' && targetMachine.kind !== 'splitter') {
    return { accepted: false, cashDelta: 0, shippedDelta: 0 };
  }

  const targetCellKey = toCellKey(targetX, targetY);

  if (occupancy.has(targetCellKey) && occupancy.get(targetCellKey) !== currentCellKey) {
    return { accepted: false, cashDelta: 0, shippedDelta: 0 };
  }

  const itemId = currentCellKey && occupancy.get(currentCellKey) ? occupancy.get(currentCellKey)! : createUuid();

  if (currentCellKey) {
    occupancy.delete(currentCellKey);
  }

  occupancy.set(targetCellKey, itemId);
  spawnedItems.push({
    id: itemId,
    kind: itemKind,
    x: targetX,
    y: targetY,
    direction: targetMachine.direction,
    progress: 0,
    ageMs: 0
  });

  return { accepted: true, cashDelta: 0, shippedDelta: 0 };
}

function canAcceptInput(machine: FactoryMachine, itemKind: ItemKind): boolean {
  const recipe = ASSEMBLER_RECIPES[machine.recipeId ?? 'logic-board'];
  const buffered = machine.bufferedItems ?? [];
  const neededCount = recipe.inputKinds.filter((candidate) => candidate === itemKind).length;
  const bufferedCount = buffered.filter((candidate) => candidate === itemKind).length;
  return bufferedCount < neededCount;
}

function hasRequiredInputs(machine: FactoryMachine, inputKinds: ItemKind[]): boolean {
  const buffered = [...(machine.bufferedItems ?? [])];

  for (const inputKind of inputKinds) {
    const index = buffered.indexOf(inputKind);
    if (index === -1) {
      return false;
    }
    buffered.splice(index, 1);
  }

  return true;
}

function removeRequiredInputs(machine: FactoryMachine, inputKinds: ItemKind[]): ItemKind[] {
  const buffered = [...(machine.bufferedItems ?? [])];

  for (const inputKind of inputKinds) {
    const index = buffered.indexOf(inputKind);
    if (index !== -1) {
      buffered.splice(index, 1);
    }
  }

  return buffered;
}

function machinesMatch(left: FactoryMachine, right: FactoryMachine): boolean {
  return left.kind === right.kind
    && left.direction === right.direction
    && left.outputKind === right.outputKind
    && left.recipeId === right.recipeId;
}

function getOutputTargets(machine: FactoryMachine, x: number, y: number) {
  const forward = DIRECTION_VECTORS[machine.direction];

  if (machine.kind !== 'splitter') {
    return [{ x: x + forward.x, y: y + forward.y }];
  }

  const clockwise = DIRECTION_VECTORS[rotateClockwise(machine.direction)];
  const primaryFirst = (machine.routeIndex ?? 0) % 2 === 0;
  const targets = primaryFirst
    ? [forward, clockwise]
    : [clockwise, forward];

  return targets.map((vector) => ({ x: x + vector.x, y: y + vector.y }));
}

function rotateClockwise(direction: Direction): Direction {
  if (direction === 'up') {
    return 'right';
  }
  if (direction === 'right') {
    return 'down';
  }
  if (direction === 'down') {
    return 'left';
  }
  return 'up';
}

function isInsideFloor(floor: FactoryFloor, x: number, y: number) {
  return x >= 0 && y >= 0 && x < floor.width && y < floor.height;
}

function smoothRevenue(previousRevenue: number, cashDelta: number, deltaMs: number) {
  const nextRevenue = deltaMs > 0 ? (cashDelta / deltaMs) * 60000 : 0;
  return previousRevenue * 0.9 + nextRevenue * 0.1;
}
