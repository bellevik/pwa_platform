import type { MegafactoryState } from './types';

const MAX_OFFLINE_MINUTES = 240;

export function applyOfflineProgress(world: MegafactoryState, nowIso: string): MegafactoryState {
  const now = Date.parse(nowIso);
  const previous = Date.parse(world.lastSimulatedAt);

  if (Number.isNaN(now) || Number.isNaN(previous) || now <= previous) {
    return world;
  }

  const elapsedMinutes = Math.min((now - previous) / 60000, MAX_OFFLINE_MINUTES);

  if (elapsedMinutes <= 0.25) {
    return {
      ...world,
      updatedAt: nowIso,
      lastSimulatedAt: nowIso
    };
  }

  const passiveIncome = world.lines.reduce((sum, line) => {
    return sum + line.floors.reduce((floorSum, floor) => {
      return floorSum + floor.stats.lastMinuteRevenue * elapsedMinutes;
    }, 0);
  }, 0);

  if (passiveIncome <= 0) {
    return {
      ...world,
      updatedAt: nowIso,
      lastSimulatedAt: nowIso
    };
  }

  return {
    ...world,
    updatedAt: nowIso,
    lastSimulatedAt: nowIso,
    profile: {
      ...world.profile,
      cash: world.profile.cash + passiveIncome,
      lifetimeCash: world.profile.lifetimeCash + passiveIncome
    }
  };
}
