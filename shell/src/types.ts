export type AppRegistryEntry = {
  slug: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  hasBackend: boolean;
  offline: boolean;
  themeColor: string;
  backgroundColor: string;
};

export type AppRegistry = {
  schemaVersion: number;
  generatedAt: string;
  apps: AppRegistryEntry[];
};

export type RegistrySource = 'network' | 'cache' | 'fallback';
