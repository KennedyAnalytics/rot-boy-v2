/**
 * Renders production stills at chosen times from one bundle, for inspection
 * during a repair loop. Not acceptance evidence on its own.
 *
 *   npx tsx scripts/render-stills.ts <props.json> <outDir> 12.5 31.9 47.2 ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { withAlias } from '../remotion.config';

const props = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = path.resolve(process.argv[3]);
const times = process.argv.slice(4).map(Number).filter((n) => Number.isFinite(n));
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), webpackOverride: withAlias });
const composition = await selectComposition({ serveUrl, id: 'StructuredFilm', inputProps: props });
for (const t of times) {
  const frame = Math.round(t * 30);
  const file = path.join(out, `still-${t.toFixed(2).padStart(7, '0')}.png`);
  await renderStill({ serveUrl, composition, inputProps: props, output: file, frame, imageFormat: 'png' });
  console.log('still', t, file);
}
// Bundles are disposable and large; do not leave one behind per preview.
fs.rmSync(serveUrl, { recursive: true, force: true });
