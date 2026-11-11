// Renders scripts/icon.svg to the PNG sizes the PWA needs. Run with `npm run icons`.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const svg = readFileSync(join(root, 'scripts', 'icon.svg'), 'utf8');

// Maskable icons get a smaller spool, because launchers crop to a central safe zone.
const maskable = svg
  .replace(
    /<circle cx="256" cy="256" r="176" fill="none" stroke="#343946"/,
    '<g transform="translate(256 256) scale(0.72) translate(-256 -256)">$&',
  )
  .replace('</svg>', '</g></svg>');

const outputs = [
  { file: 'pwa-192.png', size: 192, source: svg },
  { file: 'pwa-512.png', size: 512, source: svg },
  { file: 'pwa-maskable-512.png', size: 512, source: maskable },
  { file: 'apple-touch-icon.png', size: 180, source: svg },
];

mkdirSync(publicDir, { recursive: true });
for (const { file, size, source } of outputs) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(publicDir, file), png);
  console.log(`${file} (${size}px)`);
}
copyFileSync(join(root, 'scripts', 'icon.svg'), join(publicDir, 'favicon.svg'));
