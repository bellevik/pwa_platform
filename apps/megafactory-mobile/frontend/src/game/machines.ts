import type { Direction, ItemKind, MachineKind, ToolKind } from './types';

export const MACHINE_DEFINITIONS: Record<MachineKind, {
  label: string;
  shortLabel: string;
  cost: number;
  accent: string;
}> = {
  source: {
    label: 'Coil Extractor',
    shortLabel: 'SRC',
    cost: 120,
    accent: '#0f766e'
  },
  belt: {
    label: 'Conveyor',
    shortLabel: 'BLT',
    cost: 18,
    accent: '#475569'
  },
  splitter: {
    label: 'Smart Splitter',
    shortLabel: 'SPL',
    cost: 64,
    accent: '#7c3aed'
  },
  assembler: {
    label: 'Assembly Bay',
    shortLabel: 'ASM',
    cost: 220,
    accent: '#2563eb'
  },
  seller: {
    label: 'Dispatch Port',
    shortLabel: 'DSP',
    cost: 160,
    accent: '#ea580c'
  }
};

export const TOOL_ORDER: ToolKind[] = ['source', 'belt', 'splitter', 'assembler', 'seller', 'erase'];

export const DIRECTION_ORDER: Direction[] = ['up', 'right', 'down', 'left'];

export const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
};

export const DIRECTION_MARKERS: Record<Direction, string> = {
  up: '^',
  right: '>',
  down: 'v',
  left: '<'
};

export const ITEM_VALUES: Record<ItemKind, number> = {
  'copper-coil': 18,
  'glass-panel': 22,
  'logic-board': 48,
  'display-module': 58,
  'pocket-console': 165
};

export const ITEM_COLORS: Record<ItemKind, string> = {
  'copper-coil': '#f97316',
  'glass-panel': '#60a5fa',
  'logic-board': '#0f766e',
  'display-module': '#8b5cf6',
  'pocket-console': '#ef4444'
};

export const SOURCE_CYCLE_MS = 1350;
export const ASSEMBLER_CYCLE_MS = 2200;
export const ITEM_TILES_PER_SECOND = 2.2;
export const TILE_TRANSFER_EPSILON = 0.94;

export function rotateDirection(direction: Direction): Direction {
  const nextIndex = (DIRECTION_ORDER.indexOf(direction) + 1) % DIRECTION_ORDER.length;
  return DIRECTION_ORDER[nextIndex];
}

export function toCellKey(x: number, y: number): string {
  return `${x}:${y}`;
}
