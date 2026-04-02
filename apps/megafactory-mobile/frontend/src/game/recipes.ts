import type { AssemblerRecipeId, ItemKind } from './types';

export const ITEM_LABELS: Record<ItemKind, string> = {
  'copper-coil': 'Copper Coil',
  'glass-panel': 'Glass Panel',
  'logic-board': 'Logic Board',
  'display-module': 'Display Module',
  'pocket-console': 'Pocket Console'
};

export const ITEM_SHORT_LABELS: Record<ItemKind, string> = {
  'copper-coil': 'CC',
  'glass-panel': 'GP',
  'logic-board': 'LB',
  'display-module': 'DM',
  'pocket-console': 'PC'
};

export const SOURCE_OUTPUT_OPTIONS: Array<Extract<ItemKind, 'copper-coil' | 'glass-panel'>> = [
  'copper-coil',
  'glass-panel'
];

export const ASSEMBLER_RECIPES: Record<AssemblerRecipeId, {
  label: string;
  shortLabel: string;
  inputKinds: ItemKind[];
  outputKind: ItemKind;
  blurb: string;
}> = {
  'logic-board': {
    label: 'Logic Board',
    shortLabel: 'LB',
    inputKinds: ['copper-coil'],
    outputKind: 'logic-board',
    blurb: 'Converts copper coil stock into controller-grade logic boards.'
  },
  'display-module': {
    label: 'Display Module',
    shortLabel: 'DM',
    inputKinds: ['glass-panel'],
    outputKind: 'display-module',
    blurb: 'Bonds treated glass into finished display modules.'
  },
  'pocket-console': {
    label: 'Pocket Console',
    shortLabel: 'PC',
    inputKinds: ['logic-board', 'display-module'],
    outputKind: 'pocket-console',
    blurb: 'Combines boards and displays into finished handheld devices.'
  }
};

export const PRODUCT_LADDER = [
  {
    tier: 'Raw',
    products: ['Copper Coil', 'Glass Panel']
  },
  {
    tier: 'Modules',
    products: ['Logic Board', 'Display Module']
  },
  {
    tier: 'Devices',
    products: ['Pocket Console']
  }
];
