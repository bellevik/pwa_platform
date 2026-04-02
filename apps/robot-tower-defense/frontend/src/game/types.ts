export type Point = {
  x: number;
  y: number;
};

export type TowerTypeId = 'pulse' | 'arc' | 'cryo' | 'rail' | 'mortar';

export type EnemyTypeId = 'junkbot' | 'scuttler' | 'bulwark' | 'shield-drone' | 'repair-bot' | 'forge-titan';

export type ShotKind = 'pulse' | 'arc' | 'cryo' | 'rail' | 'mortar';

export type EnemyTag = 'swarm' | 'armored' | 'support' | 'boss' | 'shielded';

export type BuildPad = {
  id: string;
  x: number;
  y: number;
};

export type PathMetrics = {
  segmentLengths: number[];
  totalLength: number;
};

export type WaveEntry = {
  enemyTypeId: EnemyTypeId;
  count: number;
  interval: number;
  startDelay?: number;
};

export type WaveDefinition = {
  name: string;
  briefing: string;
  entries: WaveEntry[];
};

export type StageDefinition = {
  id: number;
  worldId: number;
  worldName: string;
  name: string;
  subtitle: string;
  briefing: string;
  boardWidth: number;
  boardHeight: number;
  path: Point[];
  pathMetrics: PathMetrics;
  pads: BuildPad[];
  waves: WaveDefinition[];
  startingCredits: number;
  coreIntegrity: number;
  starThresholds: {
    two: number;
    three: number;
  };
};

export type TowerTier = {
  label: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number;
  shotKind: ShotKind;
  description: string;
  slowFactor?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
  chainFalloff?: number;
  splashRadius?: number;
  armorPierce?: number;
};

export type TowerDefinition = {
  id: TowerTypeId;
  name: string;
  shortName: string;
  role: string;
  accent: string;
  body: string;
  barrel: string;
  tiers: [TowerTier, TowerTier, TowerTier];
};

export type EnemyDefinition = {
  id: EnemyTypeId;
  name: string;
  accent: string;
  body: string;
  size: number;
  speed: number;
  health: number;
  armor: number;
  shield: number;
  reward: number;
  coreDamage: number;
  tags: EnemyTag[];
  repairPerSecond?: number;
  repairRadius?: number;
  summonTypeId?: EnemyTypeId;
  summonCount?: number;
  summonCooldown?: number;
};

export type TowerState = {
  id: number;
  padId: string;
  typeId: TowerTypeId;
  level: 0 | 1 | 2;
  cooldownRemaining: number;
  totalInvested: number;
};

export type EnemyState = {
  id: number;
  typeId: EnemyTypeId;
  progress: number;
  health: number;
  shield: number;
  slowFactor: number;
  slowTimeRemaining: number;
  summonTimeRemaining: number;
};

export type SpawnToken = {
  id: number;
  enemyTypeId: EnemyTypeId;
  delay: number;
};

export type ShotEffect = {
  id: number;
  kind: ShotKind;
  ttl: number;
  points: Point[];
  explosionRadius?: number;
};

export type BattleState = {
  stageId: number;
  status: 'running' | 'won' | 'lost';
  credits: number;
  coreIntegrity: number;
  maxCoreIntegrity: number;
  towers: TowerState[];
  enemies: EnemyState[];
  spawnQueue: SpawnToken[];
  shots: ShotEffect[];
  awaitingWaveStart: boolean;
  nextWaveIndex: number;
  activeWaveIndex: number | null;
  wavesCleared: number;
  elapsed: number;
  nextTowerId: number;
  nextEnemyId: number;
  nextSpawnId: number;
  nextShotId: number;
};

export type StageResult = {
  stageId: number;
  stars: 1 | 2 | 3;
  coreIntegrity: number;
};

export type SaveData = {
  version: 1;
  unlockedStage: number;
  stageStars: Record<string, 1 | 2 | 3>;
};
