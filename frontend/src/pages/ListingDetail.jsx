import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import { listingSchema, listingIsIndexable } from '../lib/listingSchema.js';
import { imageUrl } from '../lib/images.js';
import { money, priceLabel, sizeLabel, longDate, timeAgo, titleCase } from '../lib/format.js';
import Gallery from '../components/listing/Gallery.jsx';
import SaveButton from '../components/listing/SaveButton.jsx';
import EnquiryForm from '../components/listing/EnquiryForm.jsx';
import ListingGrid from '../components/listing/ListingGrid.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import { Badge } from '../components/ui/Badge.jsx';

// Leaflet is ~40KB gzipped and no other page draws a map. Kept out of this
// page's own chunk so the listing renders before the mapping library arrives.
const PropertyMap = lazy(() => import('../components/listing/PropertyMap.jsx'));

/*
 * Trillo's overview bar puts five stars where a hotel's quality goes. A house
 * has no such number, so the same slot carries what a house is actually judged
 * on at a glance — how many rooms, and how big.
 */
const FEATURE_ICONS = {
  bed: 'M3 18v-5a2 2 0 012-2h14a2 2 0 012 2v5M3 18v2M21 18v2M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M7 11V9a1 1 0 011-1h3v3',
  bath: 'M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5v-3zM6 12V6a2 2 0 012-2 2 2 0 012 2M7 20l-1 2M17 20l1 2',
  area: 'M4 4h6V2M4 4v6H2M20 20h-6v2M20 20v-6h2M4 4l6 6M20 20l-6-6',
};

const Feature = ({ icon, children }) =>
  children == null || children === '' ? null : (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-sm text-dark-700 dark:text-dark-300">
      <svg
        viewBox="0 0 24 24"
        className="h-[1.15rem] w-[1.15rem] shrink-0 text-primary-600 dark:text-primary-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={FEATURE_ICONS[icon]} />
      </svg>
      {children}
    </span>
  );

const Spec = ({ label, value }) =>
  value == null || value === '' ? null : (
    <div>
      <dt className="text-xs uppercase tracking-wide text-dark-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );

export const ListingDetail = () => {
  const { slug } = useParams();
  const [listing, setListing] = useState(null);
  const [saved, setSaved] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const enquiryRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setListing(null);

    apiClient
      .get(`/listings/${slug}`)
      .then((data) => {
        if (cancelled) return;
        setListing(data.listing);
        setSaved(data.saved);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'That property could not be found'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    apiClient
      .get(`/listings/${slug}/similar`)
      .then((data) => {
        if (!cancelled) setSimilar(data.listings || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const schema = useMemo(() => listingSchema(listing), [listing]);

  /*
   * A property that has been let or sold keeps its page — the link is already
   * out there and a dead URL is worse than an honest one — but it must stop
   * advertising itself to search. The same predicate drives both the robots tag
   * and the structured data, so the two can never disagree.
   */
  usePageMeta({
    title: listing?.title || (loading ? 'Loading property' : 'Property not found'),
    description: listing?.description?.slice(0, 155),
    image: listing?.images?.[0] ? imageUrl(listing.images[0].url) : undefined,
    robots: listing && !listingIsIndexable(listing) ? 'noindex, follow' : undefined,
    schema,
  });

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="px-6 py-16 text-center lg:px-12">
        <h1 className="font-heading text-2xl font-extrabold">Property not found</h1>
        <p className="mt-2 text-dark-600 dark:text-dark-400">{error}</p>
        <Link to="/listings" className="btn-primary mt-6">
          Browse all properties
        </Link>
      </div>
    );
  }

  const offMarket = listing.status === 'let' || listing.status === 'sold';
  const { location, agent } = listing;
  const roomless = listing.propertyType === 'land' || listing.propertyType === 'commercial';

  const focusEnquiry = () => {
    enquiryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    enquiryRef.current?.querySelector('textarea, input')?.focus({ preventScroll: true });
  };

  return (
    <article>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 px-6 py-2.5 text-xs text-dark-500 lg:px-12"
        style={{ borderBottom: 'var(--line)' }}
      >
        <Link to="/listings" className="hover:text-primary-700">Properties</Link>
        <span aria-hidden="true">/</span>
        <Link
          to={`/listings?area=${encodeURIComponent(location.area)}`}
          className="truncate hover:text-primary-700"
        >
          {location.area}
        </Link>
      </nav>

      <Gallery images={listing.images} title={listing.title} variant="strip" />

      {/*
       * The overview bar: everything you would ask across a desk, on one line,
       * ending in the number you came for. The price block is stretched to the
       * bar's full height and carries the brass — the one place on the page that
       * colour is spent, because the one thing this page is about is money.
       */}
      {/*
       * Two parts, not one wrapping row. A seven-figure sale price is half as
       * wide again as a rent, and in one flex row that difference is enough to
       * push the block onto a line of its own — flush against nothing, half the
       * width of the bar. Splitting it means the text wraps and the price never
       * does, so it is always the stretched slab at the end of the bar.
       */}
      <div
        className="flex flex-col items-stretch lg:flex-row"
        style={{ borderBottom: 'var(--line)' }}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 lg:pl-12">
        <div className="min-w-0 flex-1 basis-full lg:basis-auto">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="primary">{listing.purpose === 'rent' ? 'To let' : 'For sale'}</Badge>
            <Badge>{titleCase(listing.propertyType)}</Badge>
            {listing.negotiable ? <Badge tone="secondary">Negotiable</Badge> : null}
          </div>
          <h1 className="font-heading text-xl font-extrabold leading-tight lg:text-2xl">
            {listing.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {roomless ? null : (
            <>
              <Feature icon="bed">
                {listing.bedrooms === 0
                  ? 'Bedsitter'
                  : `${listing.bedrooms} bed${listing.bedrooms === 1 ? '' : 's'}`}
              </Feature>
              <Feature icon="bath">
                {listing.bathrooms
                  ? `${listing.bathrooms} bath${listing.bathrooms === 1 ? '' : 's'}`
                  : null}
              </Feature>
            </>
          )}
          <Feature icon="area">{sizeLabel(listing)}</Feature>
        </div>

        <p className="flex items-center gap-1.5 text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <Link to={`/listings?area=${encodeURIComponent(location.area)}`} className="link-inline">
            {location.area}, {location.county}
          </Link>
        </p>

        </div>

        <p className="flex shrink-0 flex-col items-center justify-center gap-0.5 bg-secondary-500 px-6 py-3 text-dark-950 max-lg:flex-row max-lg:gap-2">
          <span className="whitespace-nowrap font-heading text-xl font-extrabold leading-none lg:text-2xl">
            {listing.purpose === 'rent' ? money(listing.price) : priceLabel(listing)}
          </span>
          <span className="whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-wider">
            {listing.purpose === 'rent'
              ? `per ${listing.rentPeriod || 'month'}`
              : 'asking price'}
          </span>
        </p>
      </div>

      {offMarket || listing.isStale ? (
        <div className="px-6 pt-6 lg:px-12">
          {offMarket ? (
            <Alert tone="info">
              This property is no longer on the market. It was marked{' '}
              {listing.status === 'let' ? 'let' : 'sold'} by the agent. It is kept here for
              reference.{' '}
              <Link
                to={`/listings?area=${encodeURIComponent(location.area)}`}
                className="font-semibold underline"
              >
                See what else is available in {location.area}
              </Link>
              .
            </Alert>
          ) : (
            <Alert tone="info">
              This listing has not been updated since {longDate(listing.publishedAt)}. Please
              confirm with the agent that it is still available.
            </Alert>
          )}
        </div>
      ) : null}

      {/*
       * Trillo's detail band: white panels on a tinted ground, the prose taking
       * three fifths and the thing you do about it taking the rest.
       */}
      <div
        className="flex flex-col gap-8 bg-dark-50 p-6 lg:flex-row lg:gap-12 lg:p-12 dark:bg-dark-900/40"
        style={{ borderBottom: 'var(--line)' }}
      >
        <div className="min-w-0 lg:flex-[0_0_58%]">
          <div className="bg-white p-6 shadow-panel lg:p-8 dark:bg-dark-900">
            {/* The seeded descriptions are written as paragraphs; splitting on
                blank lines keeps them readable without trusting HTML from the
                database. */}
            <div className="space-y-4 text-sm leading-relaxed text-dark-700 dark:text-dark-300">
              {listing.description.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {listing.amenities?.length ? (
              <ul
                className="list-chevron my-7 list-none py-7"
                style={{ borderTop: 'var(--line)', borderBottom: 'var(--line)' }}
              >
                {listing.amenities.map((amenity) => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            ) : null}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Spec label="Parking" value={listing.parkingSpaces || null} />
              <Spec label="Furnishing" value={titleCase(listing.furnishing)} />
              <Spec
                label="Available"
                value={listing.availableFrom ? longDate(listing.availableFrom) : 'Immediately'}
              />
              {listing.serviceCharge ? (
                <Spec label="Service charge" value={`${money(listing.serviceCharge)}/mo`} />
              ) : null}
              {listing.depositMonths ? (
                <Spec label="Deposit" value={`${listing.depositMonths} months`} />
              ) : null}
              <Spec label="Listed" value={timeAgo(listing.publishedAt || listing.createdAt)} />
            </dl>

            {/*
             * Where Trillo shows the friends who recommend the hotel. There is
             * no friend graph here and inventing one would be inventing social
             * proof, so the slot carries the only interest signal the listing
             * actually has: how many people have opened it.
             */}
            {listing.views ? (
              <p
                className="mt-7 pt-6 text-xs text-dark-500"
                style={{ borderTop: 'var(--line)' }}
              >
                Viewed {listing.views.toLocaleString()} time
                {listing.views === 1 ? '' : 's'} since it was listed.
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 lg:flex-1">
          <div className="bg-white p-6 shadow-panel dark:bg-dark-900">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-700 font-heading text-sm font-bold text-white">
                {agent?.name?.[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <Link
                  to={`/agents/${agent?._id}`}
                  className="block truncate font-semibold hover:text-primary-700"
                >
                  {agent?.agencyName || agent?.name}
                </Link>
                <p className="flex items-center gap-1 text-xs text-dark-500">
                  {agent?.agencyName ? agent.name : 'Independent agent'}
                  {agent?.verified ? (
                    <span className="inline-flex items-center gap-0.5 text-primary-700 dark:text-primary-300">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                        <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-1 2.9 1 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l1-2.9-1-2.9 2.6-1.5 1-2.8 3 .3L12 2Z" />
                      </svg>
                      Verified
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <SaveButton
                listingId={listing._id}
                initialSaved={saved}
                onChange={(_, next) => setSaved(next)}
                className="!h-10 !w-10 border border-dark-200 dark:border-dark-700"
              />
              {agent?.phone ? (
                <a href={`tel:${agent.phone}`} className="btn-outline flex-1">
                  Call
                </a>
              ) : null}
              {agent?.whatsapp ? (
                <a
                  href={`https://wa.me/254${agent.whatsapp.replace(/^(\+254|0)/, '')}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-outline flex-1"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>

            {offMarket ? (
              <p className="mt-4 bg-dark-100 px-3 py-2 text-sm text-dark-600 dark:bg-dark-800 dark:text-dark-400">
                Enquiries are closed for this property.
              </p>
            ) : (
              <div ref={enquiryRef} className="mt-5 pt-5" style={{ borderTop: 'var(--line)' }}>
                <EnquiryForm listing={listing} />
              </div>
            )}
          </div>
        </div>
      </div>

      {location.geo?.coordinates?.length === 2 ? (
        <section className="p-6 lg:p-12" style={{ borderBottom: 'var(--line)' }}>
          <h2 className="font-heading text-lg font-extrabold uppercase tracking-wide">
            Where it is
          </h2>
          <p className="mb-4 mt-1 text-sm text-dark-600 dark:text-dark-400">
            Approximate location. The agent will give you the exact address when you arrange a
            viewing.
          </p>
          <Suspense fallback={<div className="skeleton h-[320px] w-full" />}>
            <PropertyMap coordinates={location.geo.coordinates} area={location.area} />
          </Suspense>
        </section>
      ) : null}

      {/*
       * Trillo closes on a two-faced button: the invitation on its front, and
       * what pressing it actually does on its back. Nothing is booked here —
       * there is no viewing calendar — so the back face says what really
       * happens, which is that a message goes to a person.
       */}
      {offMarket ? null : (
        <div className="px-6 py-10 text-center lg:py-12" style={{ borderBottom: 'var(--line)' }}>
          <h2 className="mb-6 font-heading text-lg font-extrabold uppercase tracking-wide lg:text-xl">
            Interested in {location.area}? Ask {agent?.agencyName || agent?.name} about it
          </h2>
          <button type="button" onClick={focusEnquiry} className="btn-slide">
            <span className="btn-slide__face">Send an enquiry</span>
            <span className="btn-slide__alt">Free, and no agency fee</span>
          </button>
        </div>
      )}

      {similar.length ? (
        <section className="p-6 lg:p-12">
          <h2 className="mb-5 font-heading text-lg font-extrabold uppercase tracking-wide">
            Similar properties
          </h2>
          <ListingGrid listings={similar} />
        </section>
      ) : null}
    </article>
  );
};

export default ListingDetail;
