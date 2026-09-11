/**
 * Cuts the display font down to the glyphs in src/copy.ts. Runs before every build (and via `npm run fonts`),
 * so changing the copy can never ship a missing glyph.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';
import { COPY } from '../src/copy.ts';

const SOURCE = 'node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';
export const SUBSET_PATH = 'src/assets/fonts/lilita-one-subset.woff2';

function collect(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collect).join('');
  if (value && typeof value === 'object') return Object.values(value).map(collect).join('');
  return '';
}

export async function buildFontSubset(): Promise<void> {
  const glyphs = [...new Set(collect(COPY) + ' ')].sort().join('');
  const subset = await subsetFont(readFileSync(SOURCE), glyphs, { targetFormat: 'woff2' });
  writeFileSync(SUBSET_PATH, subset);
  const before = statSync(SOURCE).size;
  console.log(`font: ${glyphs.length} glyphs, ${(before / 1000).toFixed(1)} KB -> ${(subset.length / 1000).toFixed(1)} KB`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('subset-font.ts')) {
  await buildFontSubset();
}
