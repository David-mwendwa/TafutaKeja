import { useEffect, useState } from 'react';
import { responsiveImage } from '../../lib/images.js';

const HERO_SIZES = '(min-width: 1024px) 760px, 100vw';
const THUMB_SIZES = '120px';
// Three across the content column above `sm`; one full-width below it.
const STRIP_SIZES = '(min-width: 640px) 33vw, 100vw';

/*
 * Trillo opens on three photographs flush against each other and the edges of
 * the view — no gaps, no rounding, no controls. It works because a property is
 * sold on its pictures, and cropping the chrome away gives them the full width
 * before a word is read.
 */
const STRIP_COUNT = 3;

export const Gallery = ({ images = [], title, variant = 'hero' }) => {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const count = images.length;

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    // The page behind a lightbox must not scroll — on a phone it is otherwise
    // possible to scroll the article out from under the overlay.
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, count]);

  if (!count) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-xl bg-dark-200 text-sm text-dark-500">
        No photographs yet
      </div>
    );
  }

  const current = images[index];

  const lightboxFrom = (i) => {
    setIndex(i);
    setLightbox(true);
  };

  return (
    <>
      {variant === 'strip' ? (
        <div className="flex">
          {images.slice(0, STRIP_COUNT).map((image, i) => (
            <button
              key={image.url + i}
              type="button"
              onClick={() => lightboxFrom(i)}
              aria-label={`Open photograph ${i + 1} of ${count} full size`}
              /* Three across a phone gives each photograph about 130px, which
                 is too little to show a house. Below `sm` the first one takes
                 the full width instead and the other two stand down — the
                 lightbox still holds all of them. */
              className={`group relative block overflow-hidden bg-dark-200 ${
                i === 0 ? 'w-full sm:flex-1' : 'hidden flex-1 sm:block'
              }`}
            >
              <img
                {...responsiveImage(image.url, STRIP_SIZES)}
                alt={image.alt || title}
                /* The strip is the whole of the first screen, so none of the
                   three may wait for the lazy queue; the first is the one the
                   largest-paint metric actually watches. */
                loading="eager"
                fetchPriority={i === 0 ? 'high' : 'auto'}
                decoding="async"
                width="520"
                height="380"
                className="block aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              {/* The count sits on the last photograph on show, where a reader
                  looking for "are there more" already is — which is the first
                  one while the rest are stood down. */}
              {i === 0 && count > 1 ? (
                <span className="absolute bottom-3 right-3 rounded-full bg-dark-950/75 px-3 py-1 text-xs font-semibold text-white sm:hidden">
                  {count} photos
                </span>
              ) : null}
              {i === STRIP_COUNT - 1 && count > STRIP_COUNT ? (
                <span className="absolute bottom-3 right-3 hidden rounded-full bg-dark-950/75 px-3 py-1 text-xs font-semibold text-white sm:block">
                  +{count - STRIP_COUNT} more
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block w-full overflow-hidden rounded-xl bg-dark-200"
          aria-label="Open photograph full size"
        >
          <img
            {...responsiveImage(current.url, HERO_SIZES)}
            alt={current.alt || title}
            // The hero is the largest thing above the fold, so it is the one
            // image on the page that must not wait for the lazy queue.
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width="800"
            height="500"
            className="aspect-[16/10] w-full object-cover"
          />
        </button>

        {count > 1 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, i) => (
              <li key={image.url + i} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  aria-label={`Photograph ${i + 1} of ${count}`}
                  className={`overflow-hidden rounded-lg border-2 transition-colors ${
                    i === index ? 'border-primary-600' : 'border-transparent hover:border-dark-300'
                  }`}
                >
                  <img
                    {...responsiveImage(image.url, THUMB_SIZES)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width="120"
                    height="90"
                    className="h-[68px] w-[90px] object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      )}

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title}, photograph ${index + 1} of ${count}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/95 p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={responsiveImage(current.url).src}
            alt={current.alt || title}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + count) % count); }}
                aria-label="Previous photograph"
                className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % count); }}
                aria-label="Next photograph"
                className="absolute right-4 top-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default Gallery;
