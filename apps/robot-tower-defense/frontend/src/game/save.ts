import type { SaveData, StageResult } from './types';

const SAVE_KEY = 'robot-tower-defense.save';

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  unlockedStage: 1,
  stageStars: {}
};

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return DEFAULT_SAVE;
    }

    const parsed = JSON.parse(raw) as Partial<SaveData>;

    if (parsed.version !== 1) {
      return DEFAULT_SAVE;
    }

    return {
      version: 1,
      unlockedStage: Math.max(1, parsed.unlockedStage ?? 1),
      stageStars: parsed.stageStars ?? {}
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export function saveProgress(data: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage failures and keep the current session playable.
  }
}

export function applyStageResult(save: SaveData, result: StageResult): SaveData {
  const key = String(result.stageId);
  const previousStars = save.stageStars[key] ?? 0;

  return {
    version: 1,
    unlockedStage: Math.max(save.unlockedStage, result.stageId + 1),
    stageStars: {
      ...save.stageStars,
      [key]: Math.max(previousStars, result.stars) as 1 | 2 | 3
    }
  };
}
