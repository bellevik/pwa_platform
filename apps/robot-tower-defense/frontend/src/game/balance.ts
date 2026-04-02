import type { EnemyDefinition, EnemyTypeId, TowerDefinition, TowerState, TowerTypeId } from './types';

export const SELL_RATIO = 0.65;

export const TOWERS: Record<TowerTypeId, TowerDefinition> = {
  pulse: {
    id: 'pulse',
    name: 'Pulse Turret',
    shortName: 'Pulse',
    role: 'steady anti-walker fire',
    accent: '#8bf7ff',
    body: '#1d3a44',
    barrel: '#bff8ff',
    tiers: [
      {
        label: 'Mk I',
        cost: 75,
        damage: 18,
        range: 106,
        cooldown: 0.6,
        shotKind: 'pulse',
        description: 'Balanced pulse repeater for early pads.'
      },
      {
        label: 'Mk II',
        cost: 60,
        damage: 27,
        range: 116,
        cooldown: 0.54,
        shotKind: 'pulse',
        description: 'Improved reactor core and tighter pulse cadence.'
      },
      {
        label: 'Mk III',
        cost: 90,
        damage: 40,
        range: 126,
        cooldown: 0.48,
        shotKind: 'pulse',
        description: 'Reliable high-output lane cleaner.'
      }
    ]
  },
  arc: {
    id: 'arc',
    name: 'Arc Coil',
    shortName: 'Arc',
    role: 'chain energy for clustered waves',
    accent: '#63d0ff',
    body: '#122a4c',
    barrel: '#effbff',
    tiers: [
      {
        label: 'Mk I',
        cost: 100,
        damage: 26,
        range: 94,
        cooldown: 1.15,
        shotKind: 'arc',
        chainCount: 2,
        chainRange: 54,
        chainFalloff: 0.72,
        description: 'Jumps across tightly packed bots.'
      },
      {
        label: 'Mk II',
        cost: 80,
        damage: 36,
        range: 102,
        cooldown: 1.05,
        shotKind: 'arc',
        chainCount: 3,
        chainRange: 58,
        chainFalloff: 0.74,
        description: 'Longer arcs and a hotter charge loop.'
      },
      {
        label: 'Mk III',
        cost: 120,
        damage: 48,
        range: 112,
        cooldown: 0.96,
        shotKind: 'arc',
        chainCount: 4,
        chainRange: 62,
        chainFalloff: 0.76,
        description: 'Excellent against mixed swarms.'
      }
    ]
  },
  cryo: {
    id: 'cryo',
    name: 'Cryo Emitter',
    shortName: 'Cryo',
    role: 'slow control and setup support',
    accent: '#7ef6ff',
    body: '#17354b',
    barrel: '#eaf9ff',
    tiers: [
      {
        label: 'Mk I',
        cost: 85,
        damage: 10,
        range: 98,
        cooldown: 0.52,
        shotKind: 'cryo',
        slowFactor: 0.58,
        slowDuration: 1.3,
        description: 'Applies a heavy speed debuff to one target.'
      },
      {
        label: 'Mk II',
        cost: 65,
        damage: 16,
        range: 108,
        cooldown: 0.48,
        shotKind: 'cryo',
        slowFactor: 0.5,
        slowDuration: 1.5,
        description: 'Longer chill and more efficient output.'
      },
      {
        label: 'Mk III',
        cost: 95,
        damage: 22,
        range: 118,
        cooldown: 0.44,
        shotKind: 'cryo',
        slowFactor: 0.42,
        slowDuration: 1.7,
        description: 'Locks priority targets in the kill zone.'
      }
    ]
  },
  rail: {
    id: 'rail',
    name: 'Rail Cannon',
    shortName: 'Rail',
    role: 'high-impact anti-heavy strikes',
    accent: '#ffb15c',
    body: '#432b14',
    barrel: '#ffe7b5',
    tiers: [
      {
        label: 'Mk I',
        cost: 120,
        damage: 92,
        range: 144,
        cooldown: 1.8,
        shotKind: 'rail',
        armorPierce: 0.35,
        description: 'Punches through armored targets and bosses.'
      },
      {
        label: 'Mk II',
        cost: 90,
        damage: 128,
        range: 152,
        cooldown: 1.64,
        shotKind: 'rail',
        armorPierce: 0.45,
        description: 'A sharper rail and denser slug.'
      },
      {
        label: 'Mk III',
        cost: 140,
        damage: 178,
        range: 162,
        cooldown: 1.5,
        shotKind: 'rail',
        armorPierce: 0.55,
        description: 'Designed for Bulwarks and the Forge Titan.'
      }
    ]
  },
  mortar: {
    id: 'mortar',
    name: 'Scrap Mortar',
    shortName: 'Mortar',
    role: 'splash damage around bends',
    accent: '#ff7f5a',
    body: '#4d211d',
    barrel: '#ffd0be',
    tiers: [
      {
        label: 'Mk I',
        cost: 110,
        damage: 40,
        range: 130,
        cooldown: 1.5,
        shotKind: 'mortar',
        splashRadius: 42,
        description: 'Lobs scrap shells into clustered lanes.'
      },
      {
        label: 'Mk II',
        cost: 80,
        damage: 58,
        range: 138,
        cooldown: 1.38,
        shotKind: 'mortar',
        splashRadius: 48,
        description: 'Wider blast footprint for choke points.'
      },
      {
        label: 'Mk III',
        cost: 125,
        damage: 76,
        range: 148,
        cooldown: 1.24,
        shotKind: 'mortar',
        splashRadius: 54,
        description: 'Turns tight turns into scrap fields.'
      }
    ]
  }
};

export const ENEMIES: Record<EnemyTypeId, EnemyDefinition> = {
  junkbot: {
    id: 'junkbot',
    name: 'Junkbot',
    accent: '#7cf7c4',
    body: '#3f5848',
    size: 12,
    speed: 41,
    health: 64,
    armor: 0.02,
    shield: 0,
    reward: 14,
    coreDamage: 1,
    tags: []
  },
  scuttler: {
    id: 'scuttler',
    name: 'Scuttler',
    accent: '#f9cb58',
    body: '#524523',
    size: 10,
    speed: 64,
    health: 40,
    armor: 0,
    shield: 0,
    reward: 13,
    coreDamage: 1,
    tags: ['swarm']
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    accent: '#f08c7a',
    body: '#59383a',
    size: 15,
    speed: 28,
    health: 166,
    armor: 0.32,
    shield: 0,
    reward: 24,
    coreDamage: 1,
    tags: ['armored']
  },
  'shield-drone': {
    id: 'shield-drone',
    name: 'Shield Drone',
    accent: '#7fd4ff',
    body: '#24485f',
    size: 12,
    speed: 43,
    health: 70,
    armor: 0.08,
    shield: 52,
    reward: 22,
    coreDamage: 1,
    tags: ['shielded']
  },
  'repair-bot': {
    id: 'repair-bot',
    name: 'Repair Bot',
    accent: '#b3ff8b',
    body: '#375a2d',
    size: 12,
    speed: 37,
    health: 88,
    armor: 0.08,
    shield: 0,
    reward: 26,
    coreDamage: 1,
    tags: ['support'],
    repairPerSecond: 12,
    repairRadius: 44
  },
  'forge-titan': {
    id: 'forge-titan',
    name: 'Forge Titan',
    accent: '#ff765f',
    body: '#622d24',
    size: 22,
    speed: 20,
    health: 980,
    armor: 0.18,
    shield: 180,
    reward: 180,
    coreDamage: 4,
    tags: ['boss', 'armored', 'shielded'],
    summonTypeId: 'scuttler',
    summonCount: 2,
    summonCooldown: 7.5
  }
};

export function getTowerDefinition(typeId: TowerTypeId): TowerDefinition {
  return TOWERS[typeId];
}

export function getEnemyDefinition(typeId: EnemyTypeId): EnemyDefinition {
  return ENEMIES[typeId];
}

export function getTowerTier(tower: TowerState): TowerDefinition['tiers'][number] {
  return TOWERS[tower.typeId].tiers[tower.level];
}

export function getPlacementCost(typeId: TowerTypeId): number {
  return TOWERS[typeId].tiers[0].cost;
}

export function getUpgradeCost(tower: TowerState): number | null {
  const nextTier = TOWERS[tower.typeId].tiers[tower.level + 1];
  return nextTier?.cost ?? null;
}

export function getSellValue(tower: TowerState): number {
  return Math.round(tower.totalInvested * SELL_RATIO);
}
