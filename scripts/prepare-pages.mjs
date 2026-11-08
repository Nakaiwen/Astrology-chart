import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const [template, javascript, css, favicon] = await Promise.all([
  readFile(path.join(root, 'src/index.html'), 'utf8'),
  readFile(path.join(dist, 'natal-atelier.js'), 'utf8'),
  readFile(path.join(dist, 'natal-atelier.css'), 'utf8'),
  readFile(path.join(root, 'public/favicon.svg')),
]);
// A classic inline script also runs when the user double-clicks index.html.
// Keep all runtime assets inside the page; source and licenses remain alongside it.
const html = template
  .replace('href="./favicon.svg"', `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`)
  .replace('</head>', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>\n</head>`)
  .replace('<script type="module" src="./main.tsx"></script>', () =>
    `<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script>`);
await writeFile(path.join(dist, 'index.html'), html);
await rm(path.join(dist, 'natal-atelier.js'));
await rm(path.join(dist, 'natal-atelier.css'));
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
