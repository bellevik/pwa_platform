import { spawnSync } from 'node:child_process';
import process from 'node:process';

export function isPlatformRuntimeActive(rootDir) {
  const result = spawnSync('docker', ['compose', '-f', 'ops/docker-compose.yml', 'ps', '--status', 'running', '--services'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    return false;
  }

  const services = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return services.includes('caddy');
}

export async function assertLiveRoute(url, label) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${label} route check failed with ${response.status} for ${url}`);
  }
}
