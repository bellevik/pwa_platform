import { createUuid } from './uuid';

export type PersistentSession = {
  clientId: string;
  deviceId: string;
};

const inMemorySessions = new Map<string, PersistentSession>();

export function getPersistentSession(storageKey: string): PersistentSession {
  try {
    const existing = window.localStorage.getItem(storageKey);

    if (existing) {
      return JSON.parse(existing) as PersistentSession;
    }

    const nextSession = createSession();
    window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
    return nextSession;
  } catch {
    const existing = inMemorySessions.get(storageKey);

    if (existing) {
      return existing;
    }

    const nextSession = createSession();
    inMemorySessions.set(storageKey, nextSession);
    return nextSession;
  }
}

function createSession(): PersistentSession {
  return {
    clientId: createUuid(),
    deviceId: createUuid()
  };
}
