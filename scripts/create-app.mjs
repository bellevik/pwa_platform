import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);

if (args.length === 0) {
  usage('Missing required <slug> argument.');
}

const slug = args[0];

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  usage(`Invalid slug '${slug}'. Use lowercase kebab-case.`);
}

let name = titleizeSlug(slug);
let description = `${titleizeSlug(slug)} offline-first app`;
let hasBackend = false;
let hasDatabase = false;

for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === '--backend') {
    hasBackend = true;
    continue;
  }

  if (arg === '--database') {
    hasBackend = true;
    hasDatabase = true;
    continue;
  }

  if (arg === '--name') {
    const value = args[index + 1];
    if (!value) {
      usage('Missing value for --name.');
    }
    name = value;
    index += 1;
    continue;
  }

  if (arg === '--description') {
    const value = args[index + 1];
    if (!value) {
      usage('Missing value for --description.');
    }
    description = value;
    index += 1;
    continue;
  }

  usage(`Unknown argument '${arg}'.`);
}

const rootDir = process.cwd();
const templateDir = path.join(rootDir, 'templates', 'app-template');
const targetDir = path.join(rootDir, 'apps', slug);

await fs.access(templateDir);

try {
  await fs.access(targetDir);
  throw new Error(`Target app directory already exists at ${relative(targetDir)}`);
} catch (error) {
  if (!(error instanceof Error) || error.message.startsWith('Target app directory')) {
    throw error;
  }
}

await fs.cp(templateDir, targetDir, { recursive: true, errorOnExist: true });

const replacements = {
  __APP_SLUG__: slug,
  __APP_NAME__: name,
  __APP_DESCRIPTION__: description,
  __HAS_BACKEND__: String(hasBackend),
  __HAS_DATABASE__: String(hasDatabase),
  __DATABASE__: hasDatabase ? 'sqlite' : 'none'
};

await replaceInTree(targetDir, replacements);
await ensureExecutable(path.join(targetDir, 'START.sh'));
await ensureExecutable(path.join(targetDir, 'STOP.sh'));
await ensureExecutable(path.join(targetDir, 'RESTART.sh'));
await ensureExecutable(path.join(targetDir, 'TEST.sh'));

process.stdout.write(
  [
    `Created app scaffold at ${relative(targetDir)}`,
    `- name: ${name}`,
    `- backend: ${hasBackend}`,
    `- database: ${hasDatabase}`
  ].join('\n') + '\n'
);

async function replaceInTree(directory, replacementsMap) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const targetPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await replaceInTree(targetPath, replacementsMap);
      continue;
    }

    const content = await fs.readFile(targetPath, 'utf8');
    const nextContent = Object.entries(replacementsMap).reduce(
      (current, [placeholder, replacement]) => current.split(placeholder).join(replacement),
      content
    );

    if (nextContent !== content) {
      await fs.writeFile(targetPath, nextContent, 'utf8');
    }
  }
}

async function ensureExecutable(filePath) {
  await fs.chmod(filePath, 0o755);
}

function titleizeSlug(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function relative(targetPath) {
  return path.relative(rootDir, targetPath);
}

function usage(message) {
  const header = message ? `${message}\n` : '';
  process.stderr.write(
    `${header}Usage: bash scripts/CREATE_APP.sh <slug> [--name <name>] [--description <description>] [--backend] [--database]\n`
  );
  process.exit(1);
}
