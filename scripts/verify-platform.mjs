import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();

const registryPath = path.join(rootDir, 'generated', 'app-registry.json');
const shellDistDir = path.join(rootDir, 'shell', 'dist');
const requiredShellFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];

const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));

if (typeof registry.schemaVersion !== 'number') {
  throw new Error('generated/app-registry.json is missing schemaVersion');
}

if (!Array.isArray(registry.apps)) {
  throw new Error('generated/app-registry.json is missing apps array');
}

for (const file of requiredShellFiles) {
  const targetPath = path.join(shellDistDir, file);
  await fs.access(targetPath);
}

process.stdout.write('Platform verification passed.\n');
