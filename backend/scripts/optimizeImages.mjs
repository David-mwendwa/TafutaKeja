/**
 * Rebuilds the listing photographs into responsive WebP.
 *
 * Why this exists
 * ---------------
 * The harvest pulls Unsplash originals at 1600px and quality 80 — 138 files,
 * 40MB, mean ~290KB. A browse grid draws them at about 400px wide, so without
 * this a page of twelve properties fetches several megabytes to paint twelve
 * thumbnails. On a property marketplace the photographs *are* the product, so
 * they are the largest thing standing between a visitor and the listings —
 * comfortably larger than the JavaScript bundle.
 *
 * What it produces
 * ----------------
 * For each source image, three WebP derivatives at the widths the layout
 * actually asks for, plus a resized JPEG at the original filename:
 *
 *   exterior-abc.jpg  ->  exterior-abc-400.webp   (grid card, phone)
 *                         exterior-abc-800.webp   (grid card at 2x, gallery)
 *                         exterior-abc-1600.webp  (gallery hero at 2x)
 *                         exterior-abc.jpg        (resized in place, same name)
 *
 * The JPEG keeps its original name on purpose: every listing document stores
 * `/images/listings/exterior-abc.jpg`, and rewriting those to chase a file
 * extension would put the catalogue one failed migration away from having no
 * pictures. `lib/images.js` derives the WebP names from that path instead, and
 * the JPEG stays as the `src` fallback.
 *
 * Idempotent: an image whose derivatives are all newer than it is skipped, so
 * re-running after adding one property costs one image, not a hundred and
 * thirty-eight.
 *
 *   npm run images:optimize
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIDTHS, isRaster, processImage } from '../utils/imagePipeline.js';

const here = dirname(fileURLToPath(import.meta.url));
const DIR = join(here, '../public/images/listings');

const isDerivative = (name) => /-\d+\.webp$/.test(name);

const derivativesFor = (file) => {
  const stem = basename(file, extname(file));
  return WIDTHS.map((w) => join(DIR, `${stem}-${w}.webp`));
};

/* Up to date when every derivative exists and none is older than the source. A
 * plain existence check would keep stale renditions after a photograph is
 * replaced — the failure mode where the listing shows the previous house. */
const isFresh = (source) => {
  const src = statSync(source).mtimeMs;
  return derivativesFor(source).every(
    (d) => existsSync(d) && statSync(d).mtimeMs >= src
  );
};

const sources = readdirSync(DIR)
  .filter((f) => isRaster(f) && !isDerivative(f))
  .map((f) => join(DIR, f));

let processed = 0;
let skipped = 0;
let before = 0;
let after = 0;

for (const source of sources) {
  if (isFresh(source)) {
    skipped += 1;
    continue;
  }
  const result = await processImage(source);
  before += result.before;
  after += result.after;
  processed += 1;
  if (processed % 25 === 0) console.log(`  ${processed}/${sources.length}...`);
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
console.log(`\n${processed} processed, ${skipped} already current`);
if (processed) {
  console.log(`sources ${mb(before)} -> all renditions ${mb(after)}`);
}
