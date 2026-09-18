/**
 * Guards the prerender and the hydration rule.
 *
 *   node --test tests/
 *
 * Run against dist/, so `npm run build` must have happened first.
 *
 * The important part is FALLBACK_ROUTES. A test that only visits prerendered
 * routes cannot catch the hydration bug at all — every prerendered file matches
 * its own markup by construction, so the check passes whether or not the guard
 * exists. A route Netlify has no file for is the only case that exercises it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldHydrate } from '../src/lib/hydration.js';
import { canonicalUrl, PRERENDERED_PATHS, site } from '../src/data/site.js';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');

// Paths Netlify has no file for. It answers these with app.html, per the
// redirect in netlify.toml.
const FALLBACK_ROUTES = ['/listings', '/listing/some-property-abc123', '/saved'];

/** Models what Netlify actually serves for a path, including the 301. */
const serve = (pathname) => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const file = clean === '/' ? join(dist, 'index.html') : join(dist, clean, 'index.html');
  if (existsSync(file)) {
    // A prerendered route is served from its directory, and the un-slashed form
    // 301s to the slashed one. Model the redirect, or a harness happily serves
    // both spellings and the canonical check passes when it should not.
    return { url: clean === '/' ? '/' : `${clean}/`, html: readFileSync(file, 'utf8') };
  }
  return { url: pathname, html: readFileSync(join(dist, 'app.html'), 'utf8') };
};

const rootOf = (html) => {
  const open = html.match(/<div id="root"[^>]*>/);
  const close = html.lastIndexOf('</div>');
  return {
    stamp: html.match(/data-prerendered="([^"]*)"/)?.[1],
    markup: open && close > open.index ? html.slice(open.index + open[0].length, close) : '',
  };
};

test('every prerendered route ships real markup and its own canonical', () => {
  for (const path of PRERENDERED_PATHS) {
    const { url, html } = serve(path);
    const { markup, stamp } = rootOf(html);

    assert.ok(markup.trim().length > 200, `${path}: markup is empty`);
    assert.equal(stamp, path, `${path}: wrong data-prerendered stamp`);

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical, canonicalUrl(path), `${path}: canonical does not match`);
    // The canonical must name the URL that actually answers 200.
    assert.equal(canonical, site.url + (url === '/' ? '/' : url), `${path}: canonical names a redirect`);
  }
});

test('a prerendered route adopts its own markup', () => {
  for (const path of PRERENDERED_PATHS) {
    const { html } = serve(path);
    const { stamp, markup } = rootOf(html);
    assert.equal(
      shouldHydrate(stamp, path, markup.trim().length > 0),
      true,
      `${path}: should hydrate its own prerendered markup`
    );
  }
});

test('a fallback route never hydrates the landing page', () => {
  for (const path of FALLBACK_ROUTES) {
    const { html } = serve(path);
    const { stamp, markup } = rootOf(html);

    // Netlify serves the empty shell here, so there is nothing to adopt...
    assert.equal(markup.trim(), '', `${path}: the SPA fallback shell should be empty`);
    assert.equal(stamp, undefined, `${path}: the fallback shell must carry no stamp`);
    assert.equal(shouldHydrate(stamp, path, markup.trim().length > 0), false);
  }
});

test('the guard refuses markup stamped for a different route', () => {
  // The regression this all exists for: index.html's markup handed to /listings.
  const landing = rootOf(readFileSync(join(dist, 'index.html'), 'utf8'));
  assert.ok(landing.markup.trim().length > 200);
  assert.equal(
    shouldHydrate(landing.stamp, '/listing/anything', true),
    false,
    'landing-page markup must not be hydrated over another route'
  );
  // And it still adopts when the route does match, slash or no slash.
  assert.equal(shouldHydrate('/about', '/about/', true), true);
  assert.equal(shouldHydrate('/about', '/about', true), true);
  assert.equal(shouldHydrate('/', '/', true), true);
});

test('the fallback shell carries no canonical of its own', () => {
  const shell = readFileSync(join(dist, 'app.html'), 'utf8');
  assert.equal(
    /rel="canonical"/.test(shell),
    false,
    'app.html has a canonical — every unmatched URL would claim it as its own'
  );
});
