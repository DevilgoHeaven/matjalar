import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(scriptDir, '..', 'apps', 'web', 'public');
const targets = ['sw.js'];

for (const target of targets) {
  await rm(resolve(publicDir, target), { force: true });
}

const workerPrefix = 'swe-worker-';
const { readdir } = await import('node:fs/promises');

for (const entry of await readdir(publicDir)) {
  if (entry.startsWith(workerPrefix) && entry.endsWith('.js')) {
    await rm(resolve(publicDir, entry), { force: true });
  }
}
