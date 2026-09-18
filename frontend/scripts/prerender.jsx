/**
 * Renders the public routes to real HTML after `vite build`.
 *
 * The app ships as an empty <div id="root"> with one title for every route, so
 * anything that reads a page without executing JavaScript — every social unfurl,
 * and a crawler on its first pass — sees a blank document. This writes each
 * public route as its own index.html with its own title, description, canonical
 * and rendered markup; main.jsx then hydrates over it.
 *
 * Run through vite-node so the JSX, the aliases and the env resolve exactly as
 * they do in the real build. The .jsx extension is required rather than
 * cosmetic: vite-node only transforms what it loads, and Node claims a .mjs
 * entry for itself, so a .mjs version fails on its first .jsx import.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { site, canonicalUrl, titleForPage, PRERENDERED_PATHS } from '../src/data/site.js';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');

/*
 * The shell, with its authored comments stripped.
 *
 * HTML comments are not minified away — Vite copies index.html verbatim — so
 * view-source would otherwise expose every note about fonts, preloads and
 * managed meta tags. That reasoning belongs in the repo, not in the response.
 *
 * Only the template is stripped, never the rendered body: React writes its own
 * `<!--$-->`, `<!--/$-->` and `<!-- -->` markers into the HTML, and removing
 * those breaks hydration.
 */
const template = readFileSync(join(dist, 'index.html'), 'utf8').replace(
  /\n?\s*<!--(?!\[if)[\s\S]*?-->/g,
  ''
);

const META = {
  '/': {
    title: null,
    description: site.description,
  },
  '/about': {
    title: 'About',
    description:
      'TafutaKeja is a Kenyan property marketplace built with the MERN stack. Search by estate, compare the real numbers, and message agents directly.',
  },
  '/login': {
    title: 'Sign in',
    description: 'Sign in to TafutaKeja to save properties, message agents and manage your listings.',
  },
  '/register': {
    title: 'Create an account',
    description:
      'Create a TafutaKeja account to save properties and message agents, or list a property of your own.',
  },
  '/404': {
    title: 'Page not found',
    description: 'That page does not exist.',
    robots: 'noindex, follow',
  },
};

// Routes that are indexable but NOT prerendered — they are empty until the API
// answers, so rendering them to disk would write a blank page with a real
// canonical. They belong in the sitemap and nowhere else.
const SITEMAP_ONLY = ['/listings', '/listings?purpose=rent', '/listings?purpose=sale'];

/* renderToString does not wait for Suspense boundaries to settle — it emits the
 * fallback and moves on. Every route here is behind React.lazy, so waiting for
 * onAllReady is the whole point. */
const renderToHtml = (element) =>
  new Promise((resolvePromise, rejectPromise) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        html += chunk.toString();
        cb();
      },
    });
    sink.on('finish', () => resolvePromise(html));

    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(sink);
      },
      onError(error) {
        abort();
        rejectPromise(error);
      },
    });
  });

const escapeAttr = (value) => String(value).replace(/"/g, '&quot;');

const buildPage = async (path) => {
  const meta = META[path] || {};
  const title = titleForPage(meta.title);
  const canonical = canonicalUrl(path);
  const description = meta.description || site.description;

  const markup = await renderToHtml(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </StrictMode>
  );

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeAttr(description)}" />`
    )
    .replace(
      /<link\s+rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${canonical}" />`
    )
    .replace(
      /<meta\s+property="og:title"[^>]*>/,
      `<meta property="og:title" content="${escapeAttr(title)}" />`
    )
    .replace(
      /<meta\s+property="og:url"[^>]*>/,
      `<meta property="og:url" content="${canonical}" />`
    );

  // og:description is not in the shell, so it is inserted rather than replaced.
  html = html.replace(
    '<meta name="twitter:card"',
    `<meta property="og:description" content="${escapeAttr(description)}" />\n    <meta name="twitter:card"`
  );

  if (meta.robots) {
    html = html.replace(
      '</head>',
      `  <meta name="robots" content="${meta.robots}" />\n  </head>`
    );
  }

  /*
   * Stamp the path this file was rendered for.
   *
   * Netlify answers any unknown path with the SPA fallback — this index.html,
   * markup and all — so without the stamp, main.jsx would hydrate the landing
   * page against whatever route the reader actually asked for and React would
   * throw the document away with error #418 on every non-prerendered route.
   */
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root" data-prerendered="${path}">${markup}</div>`
  );

  const dir = path === '/' ? dist : join(dist, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);

  return { path, bytes: markup.length };
};

/*
 * Listing URLs come from the live API when it can be reached, so the sitemap
 * names the property pages that are the whole point of indexing this site.
 * A build that cannot reach it still succeeds with the static routes — a
 * sleeping Render instance must not fail a deploy.
 */
const fetchListingUrls = async () => {
  const api = process.env.VITE_API_URL || 'http://localhost:5008/api/v1';
  try {
    const res = await fetch(`${api}/listings?limit=48&sort=newest`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.listings || []).map((l) => ({
      loc: canonicalUrl(`/listing/${l.slug}`),
      lastmod: (l.updatedAt || l.publishedAt || '').slice(0, 10) || undefined,
    }));
  } catch (err) {
    console.warn(`  ! sitemap: could not reach the API (${err.message}) — static routes only`);
    return [];
  }
};

const sitemap = (listingUrls) => {
  const staticUrls = [...PRERENDERED_PATHS, ...SITEMAP_ONLY]
    // A 404 page in a sitemap is a contradiction.
    .filter((p) => p !== '/404')
    .map((p) => ({ loc: canonicalUrl(p.split('?')[0]) + (p.includes('?') ? `?${p.split('?')[1]}` : '') }));

  const all = [...staticUrls, ...listingUrls];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">'.replace(
      'www.sitemap.org',
      'www.sitemaps.org'
    ),
    ...all.map(
      ({ loc, lastmod }) =>
        `  <url><loc>${loc.replace(/&/g, '&amp;')}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    ),
    '</urlset>',
    '',
  ].join('\n');
};

const robots = () =>
  [
    'User-agent: *',
    'Allow: /',
    '',
    '# Private areas. These carry an X-Robots-Tag as well (see netlify.toml);',
    '# the header is what actually enforces it, since these pages are',
    '# client-rendered and a crawler never runs the JavaScript that would set',
    '# a meta robots tag.',
    'Disallow: /saved',
    'Disallow: /enquiries',
    'Disallow: /profile',
    'Disallow: /agent',
    'Disallow: /admin',
    'Disallow: /password',
    '',
    `Sitemap: ${site.url}/sitemap.xml`,
    '',
  ].join('\n');

/*
 * public/ is copied into dist untouched, so notes in fonts.css and the logo
 * SVGs are served to anyone who opens them — and a favicon is fetched by every
 * browser tab. fonts.css is render-blocking too, which puts those bytes on the
 * critical path.
 *
 * dist/assets is skipped deliberately: Vite has already minified what it emits
 * there, and a blanket strip would take the `/*!` licence headers with it.
 */
const stripAssetComments = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'assets') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      stripAssetComments(full);
      continue;
    }
    const comments = entry.name.endsWith('.svg')
      ? /\n?\s*<!--[\s\S]*?-->/g
      : entry.name.endsWith('.css')
        ? /\n?\s*\/\*[\s\S]*?\*\//g
        : entry.name.endsWith('.txt')
          ? /^[ \t]*#.*$\n?/gm
          : null;
    if (!comments) continue;
    const text = readFileSync(full, 'utf8');
    const cleaned = text.replace(comments, '').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
    if (cleaned !== text) writeFileSync(full, cleaned);
  }
};

/*
 * The SPA fallback shell: empty, and deliberately without a canonical.
 *
 * Netlify answers any path it has no file for with this. Pointing the fallback
 * at index.html instead would serve the *home page's* markup and its
 * `rel=canonical` for every listing URL — telling a crawler that every property
 * page is a duplicate of the home page, which is precisely backwards on a site
 * whose listing pages are the thing worth indexing.
 *
 * No canonical at all is better than a wrong one: usePageMeta writes the right
 * one as soon as the route mounts. The empty root also means hasChildNodes() is
 * false here, so main.jsx calls createRoot rather than trying to hydrate.
 */
const buildFallbackShell = () => {
  const html = template
    .replace(/<link\s+rel="canonical"[^>]*>\n?\s*/, '')
    .replace(/<meta\s+property="og:url"[^>]*>\n?\s*/, '');
  writeFileSync(join(dist, 'app.html'), html);
  return html.length;
};

const run = async () => {
  const results = [];
  for (const path of PRERENDERED_PATHS) results.push(await buildPage(path));
  const shellBytes = buildFallbackShell();

  const listingUrls = await fetchListingUrls();
  writeFileSync(join(dist, 'sitemap.xml'), sitemap(listingUrls));
  writeFileSync(join(dist, 'robots.txt'), robots());

  for (const r of results) console.log(`  prerendered ${r.path.padEnd(12)} ${r.bytes} chars`);
  console.log(`  app.html     ${shellBytes} chars (empty SPA fallback, no canonical)`);
  console.log(`  sitemap.xml (${PRERENDERED_PATHS.length - 1 + 3 + listingUrls.length} urls) + robots.txt`);

  stripAssetComments(dist);
  console.log('  stripped authored comments from dist');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
