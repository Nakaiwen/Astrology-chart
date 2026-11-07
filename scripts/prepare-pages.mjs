import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
// Only replace generated runtime assets; preserve authored source and Git metadata.
for (const name of ['assets', 'ephemeris']) {
  await rm(path.join(root, name), { recursive: true, force: true });
}
for (const item of await readdir(path.join(root, 'dist'), { withFileTypes: true })) {
  if (item.isDirectory()) await mkdir(path.join(root, item.name), { recursive: true });
  await cp(path.join(root, 'dist', item.name), path.join(root, item.name), { recursive: true });
}
await writeFile(path.join(root, '.nojekyll'), '');
console.log('GitHub Pages files prepared at the repository root.');
