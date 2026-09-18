/**
 * Fails the build on the regressions that are invisible in review.
 *
 * Every check here exists because the failure it catches looks fine from the
 * outside: a prerendered page that renders empty still returns 200, a canonical
 * that names a redirect still validates as a URL, and a returning Google Fonts
 * link still shows the right typeface. The build is the only place these get
 * caught before a deploy.
 *
 *   node scripts/verify-build.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, canonicalUrl, PRERENDERED_PATHS } from '../src/data/site.js';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');

const failures = [];
const fail = (message) => failures.push(message);

/* The gzipped budget for what a first-time visitor to the landing page must
 * download before anything renders. React and the router are most of it; the
 * number is set just above where it currently sits, so an accidental import of
 * something large trips it rather than sliding through. */
const ENTRY_BUDGET_KB = 110;

if (!existsSync(dist)) {
  console.error('dist/ does not exist — run vite build first');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Prerendered pages
// ---------------------------------------------------------------------------
for (const path of PRERENDERED_PATHS) {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html');
  if (!existsSync(file)) {
    fail(`${path}: not prerendered (${file} missing)`);
    continue;
  }

  const html = readFileSync(file, 'utf8');

  /*
   * An empty root is the whole failure this script was written for: the page
   * still returns 200 and still works once JavaScript runs, so nothing else
   * notices that the prerender silently produced nothing.
   *
   * Sliced rather than matched with one regex. Vite hoists the module script
   * into <head>, so there is no trailing <script> for a pattern to anchor on,
   * and the markup itself is full of nested </div>s — the root's own closing
   * tag is simply the last one in the file.
   */
  const openTag = html.match(/<div id="root"[^>]*>/);
  const closeAt = html.lastIndexOf('</div>');
  const rootMarkup =
    openTag && closeAt > openTag.index
      ? html.slice(openTag.index + openTag[0].length, closeAt)
      : '';
  if (rootMarkup.trim().length < 200) {
    fail(`${path}: prerendered markup is empty or near-empty (${rootMarkup.trim().length} chars)`);
  }

  // Without the stamp, main.jsx cannot tell whether the markup it was handed
  // belongs to the route being visited, and hydrates the landing page over
  // every SPA-fallback route — React error #418, prerender undone.
  const stamp = html.match(/<div id="root" data-prerendered="([^"]*)"/);
  if (!stamp) fail(`${path}: <div id="root"> is missing its data-prerendered stamp`);
  else if (stamp[1] !== path) fail(`${path}: stamped as "${stamp[1]}" instead`);

  /*
   * The canonical must equal the URL Netlify actually serves this file at.
   *
   * Netlify serves `about/index.html` for `/about/` and 301s the un-slashed
   * form, so the slashed URL is the one that answers 200. Checking merely that
   * a canonical exists would pass a page pointing at its own redirect.
   */
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  const expected = canonicalUrl(path);
  if (!canonical) fail(`${path}: no canonical`);
  else if (canonical[1] !== expected)
    fail(`${path}: canonical is ${canonical[1]}, but Netlify serves this file at ${expected}`);

  const titles = html.match(/<title>/g) || [];
  if (titles.length !== 1) fail(`${path}: ${titles.length} <title> tags, expected exactly 1`);

  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (!ogImage) fail(`${path}: no og:image`);
  else if (!ogImage[1].startsWith('http'))
    fail(`${path}: og:image is relative (${ogImage[1]}) — every scraper ignores those`);

  /*
   * Authored comments must not survive into the response. React's own markers
   * are exempt, because removing those breaks hydration: the Suspense pair
   * `<!--$-->` / `<!--/$-->` (and its `$!` / `$?` variants) and the text
   * separator, which is exactly `<!-- -->`.
   *
   * The exemption must be exactly those. An earlier version also exempted any
   * comment beginning with whitespace — which is how essentially every authored
   * comment is written, so the check could never fire at all.
   */
  const REACT_MARKER = /^<!--(\$[!?/]?|\/\$)-->$/;
  const comments = (html.match(/<!--[\s\S]*?-->/g) || []).filter(
    (c) => !REACT_MARKER.test(c) && c !== '<!-- -->' && !c.startsWith('<!--[if')
  );
  if (comments.length)
    fail(`${path}: ${comments.length} authored comment(s) left in the HTML: ${comments[0].slice(0, 60)}`);

  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html))
    fail(`${path}: a Google Fonts reference is back in the HTML`);
}

// ---------------------------------------------------------------------------
// 2. Sitemap, both directions
// ---------------------------------------------------------------------------
const sitemapPath = join(dist, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  fail('sitemap.xml was not written');
} else {
  const xml = readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  for (const path of PRERENDERED_PATHS) {
    if (path === '/404') {
      if (locs.includes(canonicalUrl(path)))
        fail('sitemap lists /404 — a 404 page in a sitemap is a contradiction');
      continue;
    }
    if (!locs.includes(canonicalUrl(path)))
      fail(`sitemap is missing ${canonicalUrl(path)}`);
  }

  // The other direction: a sitemap entry whose slashing disagrees with
  // canonicalUrl would name a URL that redirects.
  for (const loc of locs) {
    if (!loc.startsWith(site.url)) {
      fail(`sitemap entry is not on ${site.url}: ${loc}`);
      continue;
    }
    const path = loc.slice(site.url.length).split('?')[0];
    const normalised = path.replace(/\/+$/, '') || '/';
    if (PRERENDERED_PATHS.includes(normalised) && loc.split('?')[0] !== canonicalUrl(normalised))
      fail(`sitemap names ${loc}, but that file is served at ${canonicalUrl(normalised)}`);
  }
}

if (!existsSync(join(dist, 'robots.txt'))) fail('robots.txt was not written');

/*
 * The SPA fallback shell must be empty and must carry no canonical.
 *
 * It is served for every unmatched path, so a canonical here would be claimed
 * by every listing URL at once — and markup here would be hydrated against the
 * wrong route.
 */
const shellPath = join(dist, 'app.html');
if (!existsSync(shellPath)) {
  fail('app.html (the SPA fallback shell) was not written');
} else {
  const shell = readFileSync(shellPath, 'utf8');
  if (!/<div id="root"><\/div>/.test(shell))
    fail('app.html: #root is not empty — the fallback shell must render nothing');
  if (/rel="canonical"/.test(shell))
    fail('app.html: has a canonical — every unmatched URL would claim it');
  if (/data-prerendered/.test(shell))
    fail('app.html: carries a data-prerendered stamp, which would make it hydrate as that route');
}

// ---------------------------------------------------------------------------
// 3. Assets
// ---------------------------------------------------------------------------
const assetsDir = join(dist, 'assets');
if (!existsSync(assetsDir)) {
  fail('dist/assets does not exist');
} else {
  const { gzipSync } = await import('node:zlib');
  const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');

  /*
   * Every asset the shell loads must actually be on disk — a 404 inside a
   * module preload is silent until the page fails to boot.
   *
   * Only <script src> and <link href> count. Matching every href would sweep up
   * the <a> tags in the prerendered body, and an in-app route like
   * /listings?area=Kilimani is correctly not a file in dist.
   */
  const assetRefs = [
    ...indexHtml.matchAll(/<script[^>]+src="(\/[^"]+)"/g),
    ...indexHtml.matchAll(/<link[^>]+href="(\/[^"]+)"/g),
  ];
  for (const [, url] of assetRefs) {
    if (url.startsWith('//')) continue;
    if (!existsSync(join(dist, url.split('?')[0])))
      fail(`index.html loads ${url}, which is not in dist`);
  }

  // The entry chunk plus what it statically pulls in — react and the router.
  const critical = readdirSync(assetsDir).filter((f) =>
    /^(index|react|router)-.*\.js$/.test(f)
  );
  const criticalBytes = critical.reduce(
    (n, f) => n + gzipSync(readFileSync(join(assetsDir, f))).length,
    0
  );
  const criticalKb = criticalBytes / 1024;
  if (criticalKb > ENTRY_BUDGET_KB)
    fail(
      `critical path is ${criticalKb.toFixed(1)}KB gzipped, over the ${ENTRY_BUDGET_KB}KB budget`
    );

  /*
   * Leaflet must stay in its own chunk — folded into the entry it costs every
   * reader ~48KB gzipped for a map most of them never open.
   *
   * Matched on a distinctive internal rather than on the string "leaflet": the
   * entry chunk legitimately names `leaflet-<hash>.js` in its dynamic-import
   * map, and a substring check calls that a failure on every correct build.
   */
  const leafletInEntry = critical.some((f) =>
    /\b(TileLayer|_initContainer|LatLngBounds)\b/.test(
      readFileSync(join(assetsDir, f), 'utf8')
    )
  );
  if (leafletInEntry) fail('Leaflet has been pulled into the critical path — it must stay split');

  console.log(`  critical path ${criticalKb.toFixed(1)}KB gz (budget ${ENTRY_BUDGET_KB}KB)`);
}

// ---------------------------------------------------------------------------
// 4. public/ passthrough
// ---------------------------------------------------------------------------
const walkForComments = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'assets') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkForComments(full);
      continue;
    }
    const ext = extname(entry.name);
    if (!['.svg', '.css', '.txt'].includes(ext)) continue;
    const text = readFileSync(full, 'utf8');
    const found = ext === '.svg' ? /<!--/.test(text) : ext === '.css' ? /\/\*/.test(text) : /^\s*#/m.test(text);
    if (found) fail(`${full.slice(dist.length)}: authored comments survived into dist`);
  }
};
walkForComments(dist);

const fontsCss = join(dist, 'fonts', 'fonts.css');
if (existsSync(fontsCss)) {
  const css = readFileSync(fontsCss, 'utf8');
  for (const [, url] of css.matchAll(/url\((\/[^)]+)\)/g)) {
    if (!existsSync(join(dist, url)))
      fail(`fonts.css references ${url}, which is not in dist`);
  }
  if (/fonts\.gstatic\.com|fonts\.googleapis\.com/.test(css))
    fail('fonts.css points back at Google — the files must be served from our own origin');
} else {
  fail('dist/fonts/fonts.css is missing');
}

// ---------------------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ build verification failed (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`  ✓ verified ${PRERENDERED_PATHS.length} prerendered routes, sitemap, assets`);
