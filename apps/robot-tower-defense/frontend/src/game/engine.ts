import { getEnemyDefinition, getPlacementCost, getTowerDefinition, getTowerTier, getUpgradeCost, getSellValue } from './balance';
import type { BattleState, EnemyState, EnemyTypeId, Point, ShotEffect, SpawnToken, StageDefinition, TowerState, TowerTypeId, WaveDefinition } from './types';

export const FIXED_TIMESTEP = 1 / 30;
const SHOT_TTL = 0.18;
const MORTAR_TTL = 0.34;

export function createBattleState(stage: StageDefinition): BattleState {
  return {
    stageId: stage.id,
    status: 'running',
    credits: stage.startingCredits,
    coreIntegrity: stage.coreIntegrity,
    maxCoreIntegrity: stage.coreIntegrity,
    towers: [],
    enemies: [],
    spawnQueue: [],
    shots: [],
    awaitingWaveStart: true,
    nextWaveIndex: 0,
    activeWaveIndex: null,
    wavesCleared: 0,
    elapsed: 0,
    nextTowerId: 1,
    nextEnemyId: 1,
    nextSpawnId: 1,
    nextShotId: 1
  };
}

export function startNextWave(state: BattleState, stage: StageDefinition): BattleState {
  if (!state.awaitingWaveStart || state.nextWaveIndex >= stage.waves.length || state.status !== 'running') {
    return state;
  }

  const wave = stage.waves[state.nextWaveIndex];
  const spawnQueue = buildSpawnQueue(wave, state.nextSpawnId);

  return {
    ...state,
    spawnQueue,
    awaitingWaveStart: false,
    activeWaveIndex: state.nextWaveIndex,
    nextWaveIndex: state.nextWaveIndex + 1,
    nextSpawnId: state.nextSpawnId + spawnQueue.length
  };
}

function buildSpawnQueue(wave: WaveDefinition, firstSpawnId: number): SpawnToken[] {
  const queue: SpawnToken[] = [];
  let runningDelay = 0;
  let currentId = firstSpawnId;

  for (const entry of wave.entries) {
    runningDelay += entry.startDelay ?? 0;

    for (let index = 0; index < entry.count; index += 1) {
      queue.push({
        id: currentId,
        enemyTypeId: entry.enemyTypeId,
        delay: runningDelay
      });
      currentId += 1;
      runningDelay += entry.interval;
    }
  }

  return queue;
}

export function buildTower(state: BattleState, padId: string, typeId: TowerTypeId): BattleState {
  if (state.towers.some((tower) => tower.padId === padId) || state.status !== 'running') {
    return state;
  }

  const cost = getPlacementCost(typeId);

  if (state.credits < cost) {
    return state;
  }

  const tower: TowerState = {
    id: state.nextTowerId,
    padId,
    typeId,
    level: 0,
    cooldownRemaining: 0.15,
    totalInvested: cost
  };

  return {
    ...state,
    credits: state.credits - cost,
    nextTowerId: state.nextTowerId + 1,
    towers: [...state.towers, tower]
  };
}

export function upgradeTower(state: BattleState, towerId: number): BattleState {
  const tower = state.towers.find((item) => item.id === towerId);

  if (!tower || tower.level >= 2 || state.status !== 'running') {
    return state;
  }

  const upgradeCost = getUpgradeCost(tower);

  if (upgradeCost == null || state.credits < upgradeCost) {
    return state;
  }

  return {
    ...state,
    credits: state.credits - upgradeCost,
    towers: state.towers.map((item) => {
      if (item.id !== towerId) {
        return item;
      }

      return {
        ...item,
        level: (item.level + 1) as TowerState['level'],
        totalInvested: item.totalInvested + upgradeCost,
        cooldownRemaining: Math.min(item.cooldownRemaining, 0.1)
      };
    })
  };
}

export function sellTower(state: BattleState, towerId: number): BattleState {
  const tower = state.towers.find((item) => item.id === towerId);

  if (!tower) {
    return state;
  }

  return {
    ...state,
    credits: state.credits + getSellValue(tower),
    towers: state.towers.filter((item) => item.id !== towerId)
  };
}

export function getEnemyPosition(stage: StageDefinition, progress: number): Point {
  const clampedProgress = Math.max(0, Math.min(progress, stage.pathMetrics.totalLength));

  if (clampedProgress <= 0) {
    return stage.path[0];
  }

  let consumed = 0;

  for (let index = 1; index < stage.path.length; index += 1) {
    const segmentLength = stage.pathMetrics.segmentLengths[index - 1];
    const nextConsumed = consumed + segmentLength;

    if (clampedProgress <= nextConsumed) {
      const start = stage.path[index - 1];
      const end = stage.path[index];
      const segmentProgress = (clampedProgress - consumed) / segmentLength;

      return {
        x: start.x + (end.x - start.x) * segmentProgress,
        y: start.y + (end.y - start.y) * segmentProgress
      };
    }

    consumed = nextConsumed;
  }

  return stage.path[stage.path.length - 1];
}

export function stepBattle(state: BattleState, stage: StageDefinition, delta: number): BattleState {
  if (state.status !== 'running') {
    return state;
  }

  let nextState: BattleState = {
    ...state,
    elapsed: state.elapsed + delta,
    shots: state.shots
      .map((shot) => ({ ...shot, ttl: shot.ttl - delta }))
      .filter((shot) => shot.ttl > 0)
  };

  nextState = advanceSpawnQueue(nextState, delta);
  nextState = advanceEnemies(nextState, stage, delta);

  if (nextState.status !== 'running') {
    return nextState;
  }

  nextState = advanceTowers(nextState, stage, delta);

  if (nextState.status !== 'running') {
    return nextState;
  }

  if (!nextState.awaitingWaveStart && nextState.spawnQueue.length === 0 && nextState.enemies.length === 0) {
    if (nextState.nextWaveIndex >= stage.waves.length) {
      return {
        ...nextState,
        status: 'won',
        wavesCleared: stage.waves.length
      };
    }

    return {
      ...nextState,
      awaitingWaveStart: true,
      activeWaveIndex: null,
      wavesCleared: nextState.nextWaveIndex
    };
  }

  return nextState;
}

function advanceSpawnQueue(state: BattleState, delta: number): BattleState {
  const spawnQueue = state.spawnQueue.map((token) => ({ ...token, delay: token.delay - delta }));
  const ready = spawnQueue.filter((token) => token.delay <= 0);
  const pending = spawnQueue.filter((token) => token.delay > 0);

  if (ready.length === 0) {
    return {
      ...state,
      spawnQueue
    };
  }

  let nextEnemyId = state.nextEnemyId;
  const enemies = [...state.enemies];

  for (const token of ready) {
    const definition = getEnemyDefinition(token.enemyTypeId);
    enemies.push({
      id: nextEnemyId,
      typeId: token.enemyTypeId,
      progress: 0,
      health: definition.health,
      shield: definition.shield,
      slowFactor: 1,
      slowTimeRemaining: 0,
      summonTimeRemaining: definition.summonCooldown ?? 0
    });
    nextEnemyId += 1;
  }

  return {
    ...state,
    enemies,
    spawnQueue: pending,
    nextEnemyId
  };
}

function advanceEnemies(state: BattleState, stage: StageDefinition, delta: number): BattleState {
  const updatedEnemies = state.enemies.map((enemy) => {
    const definition = getEnemyDefinition(enemy.typeId);
    const slowTimeRemaining = Math.max(0, enemy.slowTimeRemaining - delta);
    const slowFactor = slowTimeRemaining > 0 ? enemy.slowFactor : 1;
    const summonTimeRemaining = definition.summonCooldown != null ? enemy.summonTimeRemaining - delta : 0;

    return {
      ...enemy,
      progress: enemy.progress + definition.speed * slowFactor * delta,
      slowTimeRemaining,
      slowFactor,
      summonTimeRemaining
    };
  });

  const enemyPoints = new Map(updatedEnemies.map((enemy) => [enemy.id, getEnemyPosition(stage, enemy.progress)]));
  const enemiesAfterRepair = updatedEnemies.map((enemy) => {
    const definition = getEnemyDefinition(enemy.typeId);

    if (!definition.repairPerSecond || !definition.repairRadius) {
      return enemy;
    }

    const sourcePoint = enemyPoints.get(enemy.id);

    if (!sourcePoint) {
      return enemy;
    }

    let heal = definition.repairPerSecond * delta;

    for (const target of updatedEnemies) {
      if (target.id === enemy.id) {
        continue;
      }

      const targetPoint = enemyPoints.get(target.id);

      if (!targetPoint) {
        continue;
      }

      const distance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);

      if (distance <= definition.repairRadius) {
        heal += definition.repairPerSecond * 0.35 * delta;
      }
    }

    return healEnemy(enemy, heal);
  });

  let nextEnemyId = state.nextEnemyId;
  const enemiesWithSummons = [...enemiesAfterRepair];

  for (const enemy of enemiesAfterRepair) {
    const definition = getEnemyDefinition(enemy.typeId);

    if (!definition.summonTypeId || !definition.summonCount || !definition.summonCooldown || enemy.summonTimeRemaining > 0) {
      continue;
    }

    const resetEnemy = enemiesWithSummons.find((candidate) => candidate.id === enemy.id);

    if (resetEnemy) {
      resetEnemy.summonTimeRemaining = definition.summonCooldown;
    }

    for (let index = 0; index < definition.summonCount; index += 1) {
      const summonDefinition = getEnemyDefinition(definition.summonTypeId);
      enemiesWithSummons.push({
        id: nextEnemyId,
        typeId: definition.summonTypeId,
        progress: Math.max(0, enemy.progress - 20 - index * 16),
        health: summonDefinition.health,
        shield: summonDefinition.shield,
        slowFactor: 1,
        slowTimeRemaining: 0,
        summonTimeRemaining: summonDefinition.summonCooldown ?? 0
      });
      nextEnemyId += 1;
    }
  }

  let coreIntegrity = state.coreIntegrity;
  const survivingEnemies: EnemyState[] = [];

  for (const enemy of enemiesWithSummons) {
    if (enemy.progress >= stage.pathMetrics.totalLength) {
      coreIntegrity -= getEnemyDefinition(enemy.typeId).coreDamage;
      continue;
    }

    survivingEnemies.push(enemy);
  }

  if (coreIntegrity <= 0) {
    return {
      ...state,
      coreIntegrity: 0,
      enemies: [],
      status: 'lost',
      nextEnemyId
    };
  }

  return {
    ...state,
    coreIntegrity,
    enemies: survivingEnemies,
    nextEnemyId
  };
}

function advanceTowers(state: BattleState, stage: StageDefinition, delta: number): BattleState {
  const towers = state.towers.map((tower) => ({
    ...tower,
    cooldownRemaining: Math.max(0, tower.cooldownRemaining - delta)
  }));

  const enemies = state.enemies.map((enemy) => ({ ...enemy }));
  const shots = [...state.shots];
  const enemyPoints = new Map(enemies.map((enemy) => [enemy.id, getEnemyPosition(stage, enemy.progress)]));
  let nextShotId = state.nextShotId;

  for (const tower of towers) {
    if (tower.cooldownRemaining > 0) {
      continue;
    }

    const pad = stage.pads.find((padItem) => padItem.id === tower.padId);

    if (!pad) {
      continue;
    }

    const tier = getTowerTier(tower);
    const target = selectTarget(enemies, enemyPoints, pad, tier.range);

    if (!target) {
      continue;
    }

    tower.cooldownRemaining = tier.cooldown;
    const towerDefinition = getTowerDefinition(tower.typeId);

    switch (tower.typeId) {
      case 'pulse': {
        dealDamage(target, tier.damage, tier.armorPierce ?? 0);
        shots.push(createShot(nextShotId, 'pulse', [pad, enemyPoints.get(target.id) ?? pad]));
        nextShotId += 1;
        break;
      }
      case 'cryo': {
        dealDamage(target, tier.damage, tier.armorPierce ?? 0);
        target.slowFactor = Math.min(target.slowFactor, tier.slowFactor ?? 1);
        target.slowTimeRemaining = Math.max(target.slowTimeRemaining, tier.slowDuration ?? 0);
        shots.push(createShot(nextShotId, 'cryo', [pad, enemyPoints.get(target.id) ?? pad]));
        nextShotId += 1;
        break;
      }
      case 'rail': {
        dealDamage(target, tier.damage, tier.armorPierce ?? 0);
        shots.push(createShot(nextShotId, 'rail', [pad, enemyPoints.get(target.id) ?? pad]));
        nextShotId += 1;
        break;
      }
      case 'mortar': {
        const targetPoint = enemyPoints.get(target.id) ?? pad;
        for (const enemy of enemies) {
          const point = enemyPoints.get(enemy.id);

          if (!point) {
            continue;
          }

          if (Math.hypot(point.x - targetPoint.x, point.y - targetPoint.y) <= (tier.splashRadius ?? 0)) {
            dealDamage(enemy, tier.damage, tier.armorPierce ?? 0);
          }
        }
        shots.push(createShot(nextShotId, 'mortar', [pad, targetPoint], tier.splashRadius));
        nextShotId += 1;
        break;
      }
      case 'arc': {
        const arcPoints: Point[] = [pad];
        let currentTarget = target;
        let damage = tier.damage;
        const hitIds = new Set<number>();

        for (let hit = 0; hit <= (tier.chainCount ?? 0); hit += 1) {
          hitIds.add(currentTarget.id);
          dealDamage(currentTarget, damage, tier.armorPierce ?? 0);
          arcPoints.push(enemyPoints.get(currentTarget.id) ?? pad);

          const nextTarget = enemies
            .filter((enemy) => !hitIds.has(enemy.id) && enemy.health > 0)
            .sort((left, right) => right.progress - left.progress)
            .find((enemy) => {
              const fromPoint = enemyPoints.get(currentTarget.id);
              const toPoint = enemyPoints.get(enemy.id);

              if (!fromPoint || !toPoint) {
                return false;
              }

              return Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y) <= (tier.chainRange ?? 0);
            });

          if (!nextTarget) {
            break;
          }

          currentTarget = nextTarget;
          damage *= tier.chainFalloff ?? 0.7;
        }

        shots.push(createShot(nextShotId, towerDefinition.tiers[tower.level].shotKind, arcPoints));
        nextShotId += 1;
        break;
      }
      default:
        break;
    }
  }

  const defeatedEnemies = enemies.filter((enemy) => enemy.health <= 0);
  const creditsGained = defeatedEnemies.reduce((sum, enemy) => sum + getEnemyDefinition(enemy.typeId).reward, 0);

  return {
    ...state,
    towers,
    enemies: enemies.filter((enemy) => enemy.health > 0),
    credits: state.credits + creditsGained,
    shots,
    nextShotId
  };
}

function selectTarget(enemies: EnemyState[], enemyPoints: Map<number, Point>, origin: Point, range: number): EnemyState | null {
  return enemies
    .filter((enemy) => {
      const point = enemyPoints.get(enemy.id);

      if (!point) {
        return false;
      }

      return Math.hypot(point.x - origin.x, point.y - origin.y) <= range;
    })
    .sort((left, right) => right.progress - left.progress)[0] ?? null;
}

function createShot(id: number, kind: ShotEffect['kind'], points: Point[], explosionRadius?: number): ShotEffect {
  return {
    id,
    kind,
    ttl: kind === 'mortar' ? MORTAR_TTL : SHOT_TTL,
    points,
    explosionRadius
  };
}

function healEnemy(enemy: EnemyState, amount: number): EnemyState {
  const definition = getEnemyDefinition(enemy.typeId);
  return {
    ...enemy,
    health: Math.min(definition.health, enemy.health + amount)
  };
}

function dealDamage(enemy: EnemyState, amount: number, armorPierce: number): void {
  if (enemy.health <= 0) {
    return;
  }

  let remaining = amount;

  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, remaining);
    enemy.shield -= absorbed;
    remaining -= absorbed;
  }

  if (remaining <= 0) {
    return;
  }

  const definition = getEnemyDefinition(enemy.typeId);
  const effectiveArmor = Math.max(0, definition.armor - armorPierce);
  enemy.health -= remaining * (1 - effectiveArmor);
}
