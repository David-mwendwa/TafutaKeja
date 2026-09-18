/**
 * One definition of the site's identity, and one definition of each page's
 * canonical URL and title.
 *
 * Both halves matter. The build script and the running app must agree, or the
 * file on disk is right and the app rewrites it a frame after hydration — a
 * drift no build verifier can catch, because what it checks is correct.
 */
export const site = {
  name: 'TafutaKeja',
  tagline: 'Find your next place in Kenya',
  description:
    'Houses and apartments to rent and for sale across Kenya: Nairobi, Mombasa, Kisumu, Nakuru and Eldoret. Browse verified listings by area, price and size.',
  url: 'https://tafutakeja.netlify.app',
  locale: 'en_KE',
  twitter: '@tafutakeja',
};

/*
 * Routes written to disk as real HTML at build time.
 *
 * Netlify serves `about/index.html` for `/about/` and 301s the un-slashed
 * `/about`, so the slashed form is the URL that answers 200 — and therefore the
 * canonical. Non-prerendered routes must NOT get a trailing slash: nothing
 * redirects them, so a slash there names a URL that does not exist.
 */
export const PRERENDERED_PATHS = ['/', '/about', '/login', '/register', '/404'];

export const canonicalUrl = (pathname = '/') => {
  const path = pathname.split('?')[0].split('#')[0];
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : '/';

  if (clean === '/') return `${site.url}/`;
  if (PRERENDERED_PATHS.includes(clean)) return `${site.url}${clean}/`;
  return `${site.url}${clean}`;
};

/*
 * The title needs one definition for the same reason the canonical does.
 * Writing `${name} — ${tagline}` in the build script and `${name} | ${tagline}`
 * in the app is a drift that only shows up after hydration.
 */
export const titleForPage = (pageTitle) =>
  pageTitle && pageTitle !== site.name
    ? `${pageTitle} · ${site.name}`
    : `${site.name} · ${site.tagline}`;
