/**
 * Decides whether prerendered markup may be adopted for the current route.
 *
 * Extracted from main.jsx so it can be tested. The rule is subtle and the
 * failure is silent: Netlify answers any path it has no file for with the SPA
 * fallback, so a non-empty #root is NOT proof that the markup belongs to the
 * route being visited. Hydrating regardless makes React discard the document
 * and log error #418 on every fallback route — undoing the prerender it was
 * meant to exploit, with nothing visibly broken.
 *
 * @param {string|undefined} stampedPath the file's data-prerendered attribute
 * @param {string} pathname where the browser actually is
 * @param {boolean} hasMarkup whether #root has children
 */
export const shouldHydrate = (stampedPath, pathname, hasMarkup) => {
  if (!hasMarkup || !stampedPath) return false;
  const normalise = (p) => (p || '').replace(/\/+$/, '') || '/';
  return normalise(stampedPath) === normalise(pathname);
};

export default shouldHydrate;
