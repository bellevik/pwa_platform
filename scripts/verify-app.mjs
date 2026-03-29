import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
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

verifyFrontendBuild(path.join(appDir, 'frontend'));
await fs.access(path.join(appDir, 'frontend', 'dist', 'manifest.webmanifest'));
await fs.access(path.join(appDir, 'frontend', 'dist', 'sw.js'));

if (config.hasBackend) {
  await verifyBackendHealth(appDir, slug);
}

process.stdout.write(`App verification passed for '${slug}'.\n`);

function verifyFrontendBuild(frontendDir) {
  const result = spawnSync('pnpm', ['build'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`Frontend build failed for '${slug}'`);
  }
}

async function verifyBackendHealth(currentAppDir, currentSlug) {
  const backendDir = path.join(currentAppDir, 'backend');
  const port = await getAvailablePort();

  const child = spawn(process.execPath, ['--experimental-sqlite', 'src/server.mjs'], {
    cwd: backendDir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port)
    },
    stdio: 'inherit',
    shell: false
  });

  try {
    await waitForHealth(`http://127.0.0.1:${port}/api/${currentSlug}/health/`);
  } finally {
    child.kill('SIGTERM');
    await onceExit(child);
  }
}

async function waitForHealth(url) {
  const startedAt = Date.now();
  const timeoutMs = 15000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(500);
  }

  throw new Error(`Backend health check timed out for '${slug}'`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    child.once('close', () => resolve());
  });
}

async function getAvailablePort() {
  const { createServer } = await import('node:net');

  return await new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to allocate an available port'));
        return;
      }

      const { port } = address;
      server.close(() => resolve(port));
    });

    server.on('error', reject);
  });
}
