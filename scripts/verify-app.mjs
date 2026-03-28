import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';

const slug = process.argv[2];

if (!slug) {
  throw new Error('Missing app slug');
}

const rootDir = process.cwd();
const appDir = path.join(rootDir, 'apps', slug);
const configPath = path.join(appDir, 'app.config.json');
const schemaPath = path.join(rootDir, 'shared', 'contracts', 'app-config.schema.json');

const requiredPaths = [
  'README.md',
  'frontend',
  'icons',
  'START.sh',
  'STOP.sh',
  'RESTART.sh',
  'TEST.sh'
];

await fs.access(appDir);

for (const relativePath of requiredPaths) {
  await fs.access(path.join(appDir, relativePath));
}

const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

if (!validate(config)) {
  const details = (validate.errors ?? [])
    .map((error) => `${error.instancePath || '(root)'} ${error.message ?? 'is invalid'}`)
    .join('; ');
  throw new Error(`Invalid app.config.json for '${slug}': ${details}`);
}

if (config.slug !== slug) {
  throw new Error(`App folder '${slug}' does not match config slug '${config.slug}'`);
}

if (config.hasDatabase) {
  await fs.access(path.join(appDir, 'data'));
}

process.stdout.write(`App verification passed for '${slug}'.\n`);
