/**
 * Builds the responsive srcset from a stored image path.
 *
 * The database holds one path per photograph — `/images/listings/foo.jpg` —
 * and the backend's image pipeline writes `foo-400.webp`, `foo-800.webp` and
 * `foo-1600.webp` beside it. Deriving the names here rather than storing four
 * paths per image means the catalogue is never one failed migration away from
 * having no pictures.
 *
 * WIDTHS must stay in step with `WIDTHS` in `backend/utils/imagePipeline.js`.
 * A tier here with no file there is a 404 inside a srcset, which a browser
 * answers by rendering no image at all.
 */
const WIDTHS = [400, 800, 1600];

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5008/api/v1').replace(
  /\/api\/v1\/?$/,
  ''
);

/** Images are served by the API, not by the frontend host. */
export const imageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
};

export const srcSet = (path) => {
  if (!path || /^https?:\/\//.test(path)) return undefined;
  const stem = path.replace(/\.[^.]+$/, '');
  return WIDTHS.map((w) => `${imageUrl(`${stem}-${w}.webp`)} ${w}w`).join(', ');
};

/**
 * @param {string} path stored image path
 * @param {string} sizes the CSS `sizes` attribute for where it is being drawn
 */
export const responsiveImage = (path, sizes) => ({
  src: imageUrl(path),
  srcSet: srcSet(path),
  sizes,
});

export const PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e1d9"/></svg>`
  );
