/**
 * Harvests real property photography from Unsplash for the seeded listings.
 *
 * Run manually (`npm run ingest`). The result is committed to
 * `data/photos.json` and the files are downloaded into
 * `public/images/listings/`, so seeding never depends on the network and the
 * catalogue is not hotlinking someone else's bandwidth.
 *
 * Photo ids come from Unsplash's public search rather than being typed by hand:
 * a guessed id is a 404, and a listing whose photographs are broken is worse
 * than one with none.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'images', 'listings');
const MANIFEST = path.join(__dirname, '..', 'data', 'photos.json');

/*
 * Buckets, not one undifferentiated pool. A listing needs an exterior to lead
 * with and interiors to follow, and a plot of land showing a fitted kitchen is
 * the kind of detail that makes a demo look careless.
 */
const QUERIES = {
  exterior: [
    'modern house exterior', 'suburban family home exterior',
    'villa exterior garden', 'bungalow house exterior',
  ],
  apartment: [
    'apartment building facade', 'modern apartment block',
    'residential tower balconies',
  ],
  living: ['modern living room interior', 'bright living room sofa', 'open plan lounge'],
  bedroom: ['modern bedroom interior', 'bright bedroom bed window'],
  kitchen: ['modern kitchen interior', 'fitted kitchen cabinets'],
  bathroom: ['modern bathroom interior', 'bathroom shower tiles'],
  land: ['empty land plot grass', 'open field plot landscape'],
  commercial: ['modern office space interior', 'retail shop front unit'],
  outdoor: ['house swimming pool garden', 'garden patio outdoor seating'],
};

const PER_QUERY = 8;
const out = {};

for (const [bucket, queries] of Object.entries(QUERIES)) {
  out[bucket] = [];
  const seen = new Set();

  for (const query of queries) {
    const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=${PER_QUERY}&orientation=landscape`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`  ! ${query}: HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();

    for (const photo of json.results ?? []) {
      // Unsplash+ results are served from plus.unsplash.com and are paywalled —
      // the host does not resolve without a subscription. Free library only.
      const raw = photo.urls?.raw ?? '';
      if (!raw.startsWith('https://images.unsplash.com/')) continue;
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);

      out[bucket].push({
        id: photo.id,
        // The raw URL carries an ixid search-tracking token specific to this one
        // query. Rebuilt from the photo path alone so what is committed is
        // stable and readable.
        download: `${raw.split('?')[0]}?auto=format&fit=crop&w=1600&q=80`,
        alt: photo.alt_description ?? photo.description ?? null,
        credit: photo.user?.name ?? null,
        creditUrl: photo.user?.links?.html ?? null,
      });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`${bucket.padEnd(11)} ${out[bucket].length} photos`);
}

await mkdir(IMAGE_DIR, { recursive: true });

// Name every photo before anything is fetched, and commit the manifest first.
// A network blip partway through the downloads then costs only the files, which
// the next run picks up, rather than the whole harvest.
for (const [bucket, photos] of Object.entries(out))
  for (const photo of photos) photo.file = `${bucket}-${photo.id}.jpg`;

await writeFile(MANIFEST, `${JSON.stringify(out, null, 2)}\n`);
console.log('\nwrote data/photos.json');

/*
 * Retry with backoff, and an explicit timeout.
 *
 * Node's fetch gives up on a connect after 10s and throws, which took down an
 * entire harvest mid-run; the same URL answered in one second from curl a
 * moment later. Treating a timeout as fatal made a transient blip look like a
 * broken CDN.
 */
const fetchWithRetry = async (url, attempts = 4) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
};

let downloaded = 0;
let skipped = 0;
const failed = [];

for (const [, photos] of Object.entries(out)) {
  for (const photo of photos) {
    const dest = path.join(IMAGE_DIR, photo.file);

    // Already on disk means already optimised by a previous run. Re-downloading
    // would put the 1600px original back, and the next optimise pass would
    // re-encode an image that is already at its target quality.
    if (existsSync(dest)) { skipped += 1; continue; }

    try {
      await writeFile(dest, await fetchWithRetry(photo.download));
      downloaded += 1;
      if (downloaded % 20 === 0) console.log(`  ${downloaded} downloaded...`);
    } catch (err) {
      failed.push(`${photo.file}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

const total = Object.values(out).reduce((n, list) => n + list.length, 0);
console.log(`\n${total} photos — ${downloaded} downloaded, ${skipped} already present, ${failed.length} failed`);
for (const f of failed) console.error(`  ! ${f}`);
console.log('next: npm run images:optimize');
