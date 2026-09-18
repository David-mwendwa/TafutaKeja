import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import ListingGrid from '../components/listing/ListingGrid.jsx';
import { organisationSchema } from '../lib/listingSchema.js';
import { responsiveImage } from '../lib/images.js';
import { shortMoney } from '../lib/format.js';
import { site } from '../data/site.js';

/*
 * The cheapest way into an estate, which is what a reader is asking when they
 * scan this list. Rent wins when an estate has both: a monthly figure is what
 * most of this catalogue is, and putting a 9M asking price next to a 45K rent
 * under one "from" would describe neither.
 */
const priceFrom = (place) => {
  if (Number.isFinite(place.rentFrom)) return `${shortMoney(place.rentFrom)}/mo`;
  if (Number.isFinite(place.saleFrom)) return shortMoney(place.saleFrom);
  return null;
};

const STEPS = [
  {
    title: 'Search where you actually want to live',
    body: 'Filter by estate, not just by county. Kilimani and Kasarani are both Nairobi, and nothing else about them is alike.',
  },
  {
    title: 'See the real numbers',
    body: 'Rent, service charge and deposit stated separately, so the figure you compare is the figure you will pay.',
  },
  {
    title: 'Talk to the agent directly',
    body: 'Send an enquiry, agree a viewing time, and keep the whole conversation in one thread.',
  },
];

/* Three across the content column, matching the listing page's opening strip. */
const STRIP_SIZES = '(min-width: 640px) 34vw, 100vw';
const STRIP_COUNT = 3;

/* Three for the strip and six for the grid below it: two clean rows, and no
   property appearing twice on one page. */
const GRID_COUNT = 6;
const FEATURED_WANTED = STRIP_COUNT + GRID_COUNT;

export const Home = () => {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState('rent');
  const [query, setQuery] = useState('');

  usePageMeta({
    title: null,
    description: site.description,
    schema: organisationSchema(),
  });

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/listings/featured', { params: { limit: FEATURED_WANTED } })
      .then((data) => {
        if (!cancelled) setFeatured(data.listings || []);
      })
      // A dead rail is not worth an error message on the landing page — the
      // rest of it is still useful and the browse link works regardless.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    apiClient
      .get('/listings/stats')
      .then((data) => {
        if (!cancelled) setStats(data.stats);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const search = (event) => {
    event.preventDefault();
    const params = new URLSearchParams({ purpose });
    if (query.trim()) params.set('search', query.trim());
    navigate(`/listings?${params}`);
  };

  /* The opening photographs and the grid used to come off the same slice, so
     the first three properties were shown twice on one screen, once as the
     hero and again as the first row of cards. */
  const strip = featured.slice(0, STRIP_COUNT);
  const grid = featured.length > STRIP_COUNT ? featured.slice(STRIP_COUNT) : featured;
  /* Named areas come from the catalogue, so this can only ever point at a
     search that has something in it. A hand-written list of "popular" estates
     goes stale the moment inventory moves and sends readers to an empty page. */
  const areas = stats?.areas?.slice(0, 8) || [];

  return (
    <>
      {/*
       * The same opening as a listing page: photographs flush to the edges,
       * before a word is read. They are the current featured properties rather
       * than stock artwork, so the landing page is showing real inventory.
       */}
      <div className="flex bg-dark-200 dark:bg-dark-900">
        {strip.length
          ? strip.map((listing, i) => (
              <Link
                key={listing._id}
                to={`/listing/${listing.slug}`}
                aria-label={listing.title}
                className={`group relative block overflow-hidden ${
                  i === 0 ? 'w-full sm:flex-1' : 'hidden flex-1 sm:block'
                }`}
              >
                <img
                  {...responsiveImage(listing.images?.[0]?.url, STRIP_SIZES)}
                  alt=""
                  loading="eager"
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  decoding="async"
                  width="520"
                  height="360"
                  className="block aspect-[13/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] sm:aspect-[4/3]"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-950/85 to-transparent px-4 pb-3 pt-10 text-xs font-semibold text-white">
                  {listing.location.area}, {listing.location.county}
                </span>
              </Link>
            ))
          : /* Holds the strip's height while the API answers, so the overview
               bar below it does not jump up and then back down. */
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className={`skeleton aspect-[13/9] sm:aspect-[4/3] ${
                  i === 0 ? 'w-full sm:flex-1' : 'hidden flex-1 sm:block'
                }`}
              />
            ))}
      </div>

      {/*
       * The overview bar, built like the listing page's: a text half that may
       * wrap, and a brass block that never does. A five-figure count is not
       * going to push it onto its own line, but keeping the two pages
       * structurally identical is the point of borrowing the layout at all.
       */}
      <div
        className="flex flex-wrap items-stretch"
        style={{ borderBottom: 'var(--line)' }}
      >
        <div className="min-w-0 flex-1 basis-full px-6 py-5 lg:basis-auto lg:px-12">
          <h1 className="font-heading text-2xl font-extrabold leading-tight lg:text-3xl">
            Find your next place in Kenya
          </h1>
          <p className="mt-1.5 text-sm text-dark-600 dark:text-dark-400">
            Houses, apartments and plots to rent and for sale, searchable by the estate you
            actually want to live in.
          </p>
        </div>

        <Link
          to="/listings"
          className="flex items-center justify-center gap-3 bg-secondary-500 px-6 py-4 text-dark-950 transition-colors hover:bg-secondary-400 max-lg:w-full lg:flex-col lg:gap-0 lg:px-8"
        >
          <span className="font-heading text-2xl font-extrabold leading-none lg:text-3xl">
            {stats ? stats.total : '–'}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider">
            properties to browse
          </span>
        </Link>
      </div>

      {/* Search sits on the tinted ground, the way the listing page's detail
          band does, so the white panels below it read as a set. */}
      <div
        className="bg-dark-50 px-6 py-6 lg:px-12 dark:bg-dark-900/40"
        style={{ borderBottom: 'var(--line)' }}
      >
        <form onSubmit={search} className="bg-white p-3 shadow-panel dark:bg-dark-900">
          <div className="flex gap-1 pb-3">
            {[
              ['rent', 'To let'],
              ['sale', 'For sale'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPurpose(value)}
                aria-pressed={purpose === value}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  purpose === value
                    ? 'bg-primary-700 text-white'
                    : 'text-dark-600 hover:bg-dark-100 dark:text-dark-300 dark:hover:bg-dark-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="home-search" className="sr-only">
              Search by area or town
            </label>
            <input
              id="home-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try an estate: Kilimani, Nyali, Syokimau…"
              className="field flex-1"
            />
            <button type="submit" className="btn-primary sm:px-10">
              Search
            </button>
          </div>

          {stats ? (
            <p className="mt-3 text-xs text-dark-500">
              {stats.rent} to let · {stats.sale} for sale · {stats.areas.length} estates across{' '}
              {stats.counties} counties
            </p>
          ) : null}
        </form>
      </div>

      {/* The detail band: white panels on tinted ground, prose taking the
          larger share, exactly as on a listing page. */}
      <div
        className="flex flex-col gap-8 bg-dark-50 p-6 lg:flex-row lg:gap-12 lg:p-12 dark:bg-dark-900/40"
        style={{ borderBottom: 'var(--line)' }}
      >
        <div className="min-w-0 lg:flex-[0_0_58%]">
          {/* The panel is stretched to the estates list beside it, which is
              always the taller of the two, so the steps spread into the height
              rather than leaving it blank under the third one. */}
          <div className="flex h-full flex-col bg-white p-6 shadow-panel lg:p-8 dark:bg-dark-900">
            <h2 className="font-heading text-lg font-extrabold uppercase tracking-wide">
              How it works
            </h2>
            <ol className="mt-5 flex flex-1 flex-col justify-between gap-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-700 font-heading text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm text-dark-600 dark:text-dark-400">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="min-w-0 lg:flex-1">
          <div className="h-full bg-white p-6 shadow-panel dark:bg-dark-900">
            <h2 className="font-heading text-lg font-extrabold uppercase tracking-wide">
              Where people are looking
            </h2>
            <p className="mt-1 text-xs text-dark-500">Busiest estates this month.</p>
            {areas.length ? (
              <ul className="mt-5 space-y-1">
                {areas.map((place) => (
                  <li key={`${place.area}-${place.county}`}>
                    {/* The county is part of the link, not decoration: two
                        different estates are called Milimani, so an area-only
                        search returns seven where this row promises five. */}
                    <Link
                      to={`/listings?area=${encodeURIComponent(place.area)}&county=${encodeURIComponent(place.county)}`}
                      className="-mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-dark-100 dark:hover:bg-dark-800"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{place.area}</span>
                        <span className="ml-2 text-xs text-dark-500">{place.county}</span>
                      </span>
                      <span className="shrink-0 text-xs text-dark-500">
                        {place.count} {place.count === 1 ? 'listing' : 'listings'}
                        {priceFrom(place) ? (
                          <>
                            {' · from '}
                            <span className="font-semibold text-primary-700 dark:text-primary-300">
                              {priceFrom(place)}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 space-y-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-7 w-full" />
                ))}
              </div>
            )}
            <Link to="/listings" className="link-inline mt-5 inline-block">
              Browse every estate <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      <section className="p-6 lg:p-12" style={{ borderBottom: 'var(--line)' }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-extrabold uppercase tracking-wide">
              Featured properties
            </h2>
            <p className="mt-1 text-sm text-dark-600 dark:text-dark-400">
              Hand-picked listings from verified agents.
            </p>
          </div>
          <Link to="/listings" className="btn-outline shrink-0">
            See all
          </Link>
        </div>
        <ListingGrid listings={grid} loading={loading} count={GRID_COUNT} />
      </section>

      {/* Closes the way a listing page does — the second face saying what the
          button actually does rather than what it sounds like. */}
      <div className="px-6 py-10 text-center lg:py-12">
        <h2 className="mb-3 font-heading text-lg font-extrabold uppercase tracking-wide lg:text-xl">
          Letting or selling a property?
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-sm text-dark-600 dark:text-dark-400">
          List it on {site.name}, manage enquiries in one place, and reach people searching your
          estate by name.
        </p>
        <Link to="/register?role=agent" className="btn-slide">
          <span className="btn-slide__face">List your property</span>
          <span className="btn-slide__alt">Free while we are growing</span>
        </Link>
      </div>
    </>
  );
};

export default Home;
