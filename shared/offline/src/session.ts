export type PersistentSession = {
  clientId: string;
  deviceId: string;
};

export function getPersistentSession(storageKey: string): PersistentSession {
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return JSON.parse(existing) as PersistentSession;
  }

  const nextSession = {
    clientId: crypto.randomUUID(),
    deviceId: crypto.randomUUID()
  };

  window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
  return nextSession;
}
