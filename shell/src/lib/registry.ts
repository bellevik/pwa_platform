import type { AppRegistry } from '../types';

const REGISTRY_URL = '/generated/app-registry.json';
const REGISTRY_CACHE_KEY = 'pwa-platform.shell.registry';

const fallbackRegistry: AppRegistry = {
  schemaVersion: 1,
  generatedAt: '1970-01-01T00:00:00.000Z',
  apps: []
};

export const readCachedRegistry = (): AppRegistry | null => {
  const raw = window.localStorage.getItem(REGISTRY_CACHE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return validateRegistry(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(REGISTRY_CACHE_KEY);
    return null;
  }
};

export const fetchRegistry = async (): Promise<AppRegistry> => {
  const response = await fetch(REGISTRY_URL, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Registry request failed with ${response.status}`);
  }

  const parsed = validateRegistry(await response.json());
  window.localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(parsed));
  return parsed;
};

export const getFallbackRegistry = (): AppRegistry => fallbackRegistry;

const validateRegistry = (value: unknown): AppRegistry => {
  if (!value || typeof value !== 'object') {
    throw new Error('Registry must be an object');
  }

  const candidate = value as Partial<AppRegistry>;

  if (typeof candidate.schemaVersion !== 'number') {
    throw new Error('Registry schemaVersion is invalid');
  }

  if (typeof candidate.generatedAt !== 'string') {
    throw new Error('Registry generatedAt is invalid');
  }

  if (!Array.isArray(candidate.apps)) {
    throw new Error('Registry apps is invalid');
  }

  return {
    schemaVersion: candidate.schemaVersion,
    generatedAt: candidate.generatedAt,
    apps: candidate.apps.map((app) => {
      if (!app || typeof app !== 'object') {
        throw new Error('Registry app entry is invalid');
      }

      const entry = app as Record<string, unknown>;

      return {
        slug: expectString(entry.slug, 'slug'),
        name: expectString(entry.name, 'name'),
        description: expectString(entry.description, 'description'),
        route: expectString(entry.route, 'route'),
        icon: expectString(entry.icon, 'icon'),
        hasBackend: expectBoolean(entry.hasBackend, 'hasBackend'),
        offline: expectBoolean(entry.offline, 'offline'),
        themeColor: expectString(entry.themeColor, 'themeColor'),
        backgroundColor: expectString(entry.backgroundColor, 'backgroundColor')
      };
    })
  };
};

const expectString = (value: unknown, name: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Registry ${name} is invalid`);
  }

  return value;
};

const expectBoolean = (value: unknown, name: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`Registry ${name} is invalid`);
  }

  return value;
};
