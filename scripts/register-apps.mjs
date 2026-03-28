import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const rootDir = process.cwd();
const appsDir = path.join(rootDir, 'apps');
const generatedDir = path.join(rootDir, 'generated');
const outputPath = path.join(generatedDir, 'app-registry.json');
const schemaPath = path.join(rootDir, 'shared', 'contracts', 'app-config.schema.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

const appEntries = [];
const appDirs = await readDirectories(appsDir);

for (const appDir of appDirs) {
  const configPath = path.join(appsDir, appDir, 'app.config.json');

  try {
    await fs.access(configPath);
  } catch {
    continue;
  }

  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const isValid = validate(config);

  if (!isValid) {
    throw new Error(formatAjvErrors(appDir, validate.errors ?? []));
  }

  enforceAppConfigRules(appDir, config, configPath);

  appEntries.push({
    slug: config.slug,
    name: config.name,
    description: config.description,
    route: config.route,
    icon: config.icon,
    hasBackend: config.hasBackend,
    offline: config.offline,
    themeColor: config.themeColor,
    backgroundColor: config.backgroundColor
  });
}

appEntries.sort((left, right) => left.slug.localeCompare(right.slug));

const registry = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  apps: appEntries
};

await fs.mkdir(generatedDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

process.stdout.write(
  `Generated app registry with ${appEntries.length} app${appEntries.length === 1 ? '' : 's'} at ${path.relative(rootDir, outputPath)}\n`
);

async function readDirectories(targetDir) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function enforceAppConfigRules(appDir, config, configPath) {
  if (config.slug !== appDir) {
    throw new Error(`App folder '${appDir}' does not match slug '${config.slug}' in ${relative(configPath)}`);
  }

  if (config.route !== `/${config.slug}/`) {
    throw new Error(`App route must be '/${config.slug}/' in ${relative(configPath)}`);
  }

  if (config.apiBase !== `/api/${config.slug}/`) {
    throw new Error(`App apiBase must be '/api/${config.slug}/' in ${relative(configPath)}`);
  }

  if (config.hasBackend === false && config.hasDatabase === true) {
    throw new Error(`Static-only app '${config.slug}' cannot set hasDatabase to true in ${relative(configPath)}`);
  }

  if (config.icon.startsWith(`/${config.slug}/icons/`) === false) {
    throw new Error(`App icon must stay within '/${config.slug}/icons/' in ${relative(configPath)}`);
  }
}

function formatAjvErrors(appDir, errors) {
  const lines = errors.map((error) => {
    const location = error.instancePath || '(root)';
    return `- ${location} ${error.message ?? 'is invalid'}`;
  });

  return [`Invalid app config for '${appDir}':`, ...lines].join('\n');
}

function relative(targetPath) {
  return path.relative(rootDir, targetPath);
}
