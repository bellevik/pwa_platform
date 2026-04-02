import type { AppRegistry } from '../types';

const REGISTRY_URL = '/generated/app-registry.json';
const REGISTRY_CACHE_KEY = 'pwa-platform.shell.registry';

const fallbackRegistry: AppRegistry = {
  schemaVersion: 1,
  generatedAt: '1970-01-01T00:00:00.000Z',
  apps: [
    {
      slug: 'calculator',
      name: 'Calculator',
      description: 'Futuristic neumorphic calculator with persistent local history and tactile sci-fi controls',
      route: '/calculator/',
      icon: '/calculator/app-icon-192.png',
      hasBackend: false,
      offline: true,
      themeColor: '#182235',
      backgroundColor: '#0d1422'
    },
    {
      slug: 'daily-notes',
      name: 'Daily Notes',
      description: 'Quick capture notes app used to prove the generated static app workflow',
      route: '/daily-notes/',
      icon: '/daily-notes/app-icon-192.png',
      hasBackend: false,
      offline: true,
      themeColor: '#5f4bb6',
      backgroundColor: '#f5f0ff'
    },
    {
      slug: 'flappy-bird',
      name: 'Flappy Bird Clone',
      description: 'Arcade-style Flappy Bird clone with touch controls, local best score tracking, and offline PWA installability',
      route: '/flappy-bird/',
      icon: '/flappy-bird/icons/app-icon.svg',
      hasBackend: false,
      offline: true,
      themeColor: '#0c8aa5',
      backgroundColor: '#c8f1ff'
    },
    {
      slug: 'megafactory-mobile',
      name: 'Pocket Megafactory',
      description: 'Portrait-only offline-first consumer-tech factory sim with cloud backup',
      route: '/megafactory-mobile/',
      icon: '/megafactory-mobile/icons/app-icon.svg',
      hasBackend: true,
      offline: true,
      themeColor: '#0f766e',
      backgroundColor: '#f5f2e9'
    },
    {
      slug: 'robot-tower-defense',
      name: 'Robot Tower Defense',
      description: 'Portrait-first robot tower defense campaign with fixed pads, manual wave starts, and offline PWA play',
      route: '/robot-tower-defense/',
      icon: '/robot-tower-defense/icons/app-icon.svg',
      hasBackend: false,
      offline: true,
      themeColor: '#0e2432',
      backgroundColor: '#071017'
    },
    {
      slug: 'shopping-list',
      name: 'Shopping List',
      description: 'Offline-first shopping list with local queue and sync-ready backend',
      route: '/shopping-list/',
      icon: '/shopping-list/app-icon-192.png',
      hasBackend: true,
      offline: true,
      themeColor: '#28536b',
      backgroundColor: '#f7f3e8'
    }
  ]
};

export const readCachedRegistry = (): AppRegistry | null => {
  const raw = window.localStorage.getItem(REGISTRY_CACHE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return mergeWithFallback(validateRegistry(JSON.parse(raw)));
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

  const parsed = mergeWithFallback(validateRegistry(await response.json()));
  window.localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(parsed));
  return parsed;
};

export const getFallbackRegistry = (): AppRegistry => fallbackRegistry;

function mergeWithFallback(registry: AppRegistry): AppRegistry {
  const bySlug = new Map(fallbackRegistry.apps.map((app) => [app.slug, app]));

  for (const app of registry.apps) {
    bySlug.set(app.slug, app);
  }

  return {
    ...registry,
    apps: Array.from(bySlug.values()).sort((left, right) => left.slug.localeCompare(right.slug))
  };
}

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
