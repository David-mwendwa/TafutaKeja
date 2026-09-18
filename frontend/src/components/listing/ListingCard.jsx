import { Link } from 'react-router-dom';
import { responsiveImage, PLACEHOLDER } from '../../lib/images.js';
import { shortPriceLabel, bedLabel, sizeLabel, titleCase } from '../../lib/format.js';
import { StatusBadge } from '../ui/Badge.jsx';
import SaveButton from './SaveButton.jsx';

/*
 * `sizes` tells the browser how wide this image will actually be drawn before
 * it has any layout, so it can pick the right srcset entry on the first pass.
 * Left off, browsers assume 100vw and fetch the 1600px file for a card that is
 * never wider than about 380 — which is the whole responsive-image saving,
 * thrown away silently.
 */
const CARD_SIZES = '(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw';

export const ListingCard = ({ listing, showStatus = false, onSavedChange }) => {
  const cover = listing.images?.[0];
  const image = cover ? responsiveImage(cover.url, CARD_SIZES) : null;
  const offMarket = listing.status === 'let' || listing.status === 'sold';

  return (
    <article className="card group relative overflow-hidden transition-shadow hover:shadow-card-hover">
      <Link to={`/listing/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-dark-200">
          <img
            {...(image || { src: PLACEHOLDER })}
            alt={cover?.alt || listing.title}
            // Cards are always below the fold on a browse page, and eager
            // loading them competes with the hero for the same connection.
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              offMarket ? 'opacity-60 grayscale' : ''
            }`}
          />

          <span className="absolute left-3 top-3 rounded-md bg-dark-950/75 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {listing.purpose === 'rent' ? 'To let' : 'For sale'}
          </span>

          {listing.featured && !offMarket ? (
            <span className="absolute right-12 top-3 rounded-md bg-secondary-500 px-2 py-1 text-xs font-bold text-dark-950">
              Featured
            </span>
          ) : null}

          {offMarket ? (
            <span className="absolute inset-x-0 bottom-0 bg-dark-950/80 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-white">
              {listing.status === 'let' ? 'Let agreed' : 'Sold'}
            </span>
          ) : null}
        </div>
      </Link>

      {/* Outside the Link: a button nested in an anchor is invalid markup and
          the click target becomes ambiguous for keyboard and screen readers. */}
      <SaveButton
        listingId={listing._id}
        initialSaved={listing.saved}
        onChange={onSavedChange}
        className="absolute right-3 top-3"
      />

      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-heading text-lg font-extrabold text-primary-800 dark:text-primary-300">
            {shortPriceLabel(listing)}
          </p>
          {showStatus ? <StatusBadge status={listing.status} /> : null}
        </div>

        <Link to={`/listing/${listing.slug}`} className="block">
          <h3 className="line-clamp-2 text-sm font-semibold text-dark-900 hover:text-primary-700 dark:text-dark-100">
            {listing.title}
          </h3>
        </Link>

        <p className="text-sm text-dark-600 dark:text-dark-400">
          {listing.location?.area}, {listing.location?.county}
        </p>

        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-dark-600 dark:text-dark-400">
          {bedLabel(listing) ? <li>{bedLabel(listing)}</li> : null}
          {listing.bathrooms ? <li>{listing.bathrooms} bath</li> : null}
          {sizeLabel(listing) ? <li>{sizeLabel(listing)}</li> : null}
          {/* A bedsitter's bed label already says "Bedsitter", so repeating the
              property type renders "Bedsitter · 1 bath · 24 m² · Bedsitter". */}
          {bedLabel(listing)?.toLowerCase() === listing.propertyType ? null : (
            <li className="text-dark-500">{titleCase(listing.propertyType)}</li>
          )}
        </ul>
      </div>
    </article>
  );
};

export default ListingCard;
