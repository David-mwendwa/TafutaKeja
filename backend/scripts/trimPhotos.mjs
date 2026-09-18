/**
 * Trims the harvested pool to the number of photographs the catalogue actually
 * uses, and deletes the files that fall outside it.
 *
 * The harvest casts wide on purpose — a search returns duplicates and the
 * occasional photograph that is not of a building at all — but every kept file
 * is committed and shipped, so the pool is cut to size before it is optimised
 * rather than after. Lead photographs are sized so every listing can have its
 * own; interiors are allowed to repeat across areas, where the reuse does not
 * read.
 */
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'images', 'listings');
const MANIFEST = path.join(__dirname, '..', 'data', 'photos.json');

const KEEP = {
  exterior: 34, apartment: 24, land: 8, commercial: 6, // leads, one per listing
  living: 18, bedroom: 14, kitchen: 12, bathroom: 10, outdoor: 12, // shared
};

const photos = JSON.parse(await readFile(MANIFEST, 'utf8'));
let removed = 0;

for (const [bucket, list] of Object.entries(photos)) {
  const keep = KEEP[bucket] ?? 0;
  for (const photo of list.slice(keep)) {
    await unlink(path.join(IMAGE_DIR, photo.file)).catch(() => {});
    removed += 1;
  }
  photos[bucket] = list.slice(0, keep);
}

await writeFile(MANIFEST, `${JSON.stringify(photos, null, 2)}\n`);

const kept = Object.values(photos).reduce((n, l) => n + l.length, 0);
console.log(`kept ${kept} photos, removed ${removed}`);
for (const [b, l] of Object.entries(photos)) console.log(`  ${b.padEnd(11)} ${l.length}`);
