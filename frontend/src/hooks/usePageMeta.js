import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site, canonicalUrl, titleForPage } from '../data/site.js';

const setMeta = (selector, attr, value) => {
  let el = document.head.querySelector(selector);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    const [, key, name] = selector.match(/\[(\w+)="([^"]+)"\]/) || [];
    if (key) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const setJsonLd = (data) => {
  const existing = document.head.querySelector('script[data-page-schema]');
  existing?.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-page-schema', '');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

/**
 * Keeps the document head in step with the route.
 *
 * `canonicalUrl` and `titleForPage` are imported rather than re-derived here.
 * Building `site.url + location.pathname` locally is the bug that has bitten
 * several projects in this workspace: a prerendered route is served from a
 * directory, so `/about/` is the URL that answers 200, but an in-app <Link>
 * fires no redirect and `location.pathname` stays `/about` — so the app quietly
 * rewrites a correct canonical into one that 301s. A direct hit hides it
 * completely, because the redirect fixes the path before any JavaScript runs.
 */
export const usePageMeta = ({ title, description, image, robots, schema } = {}) => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleForPage(title);

    const desc = description || site.description;
    setMeta('meta[name="description"]', 'content', desc);

    const canonical = canonicalUrl(pathname);
    setLink('canonical', canonical);

    setMeta('meta[property="og:title"]', 'content', titleForPage(title));
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:site_name"]', 'content', site.name);
    // Absolute, always: a relative og:image is ignored by every scraper.
    setMeta(
      'meta[property="og:image"]',
      'content',
      image?.startsWith('http') ? image : `${site.url}${image || '/og-default.jpg'}`
    );
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');

    // Only set when a page asks to be hidden. A blanket "index, follow" on
    // every page adds nothing — it is the default — and one stale value left
    // behind by a previous route would be actively wrong.
    setMeta('meta[name="robots"]', 'content', robots || null);

    setJsonLd(schema || null);
  }, [pathname, title, description, image, robots, schema]);
};

export default usePageMeta;
