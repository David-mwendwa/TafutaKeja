import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import ListingGrid from '../components/listing/ListingGrid.jsx';
import Filters from '../components/listing/Filters.jsx';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const FILTER_KEYS = [
  'purpose', 'propertyType', 'county', 'area', 'minPrice', 'maxPrice',
  'bedrooms', 'bathrooms', 'furnishing', 'amenities', 'search', 'sort',
];

const SORT_LABELS = {
  newest: 'Newest first',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  bedrooms: 'Most bedrooms',
  size: 'Largest first',
  popular: 'Most viewed',
};

/**
 * The filters live in the URL, not in component state.
 *
 * It is what makes a search shareable and the back button work, and it is the
 * only way a filtered page can ever be linked to from the footer or a search
 * engine. Component state alone would leave every filtered view at the same
 * URL — one page as far as anyone outside the tab is concerned.
 */
export const Browse = () => {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [meta, setMeta] = useState(null);
  const [pageMeta, setPageMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => {
    const out = {};
    for (const key of FILTER_KEYS) out[key] = params.get(key) || '';
    return out;
  }, [params]);

  const page = Number(params.get('page')) || 1;

  useEffect(() => {
    apiClient
      .get('/listings/meta')
      .then((data) => setMeta(data.meta))
      .catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    apiClient
      .get('/listings', { params: { ...filters, page, limit: 12 } })
      .then((data) => {
        if (cancelled) return;
        setListings(data.listings || []);
        setPageMeta(data.meta || null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load properties'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  const applyFilters = useCallback(
    (next) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value !== '' && value != null) search.set(key, value);
      }
      // Any filter change resets to page one: staying on page 4 of a result set
      // that now has two pages shows an empty grid and reads as "no results".
      setParams(search, { replace: true });
    },
    [setParams]
  );

  const heading = useMemo(() => {
    const what = filters.purpose === 'sale' ? 'Property for sale' : filters.purpose === 'rent' ? 'Property to let' : 'All properties';
    const where = filters.area || filters.county;
    return where ? `${what} in ${where}` : what;
  }, [filters]);

  usePageMeta({
    title: heading,
    description: `Browse ${heading.toLowerCase()} on TafutaKeja. Filter by area, price, bedrooms and amenities.`,
  });

  const activeCount = FILTER_KEYS.filter((k) => k !== 'sort' && filters[k]).length;
  const totalPages = pageMeta?.pages || 1;

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-extrabold">{heading}</h1>
        <p className="mt-1 text-sm text-dark-600 dark:text-dark-400">
          {loading
            ? 'Searching…'
            : `${pageMeta?.total ?? 0} ${pageMeta?.total === 1 ? 'property' : 'properties'} found`}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            <Filters
              meta={meta}
              value={filters}
              onChange={applyFilters}
              onReset={() => setParams(new URLSearchParams(), { replace: true })}
            />
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="btn-outline lg:hidden"
              aria-expanded={showFilters}
            >
              Filters{activeCount ? ` (${activeCount})` : ''}
            </button>

            <label htmlFor="sort" className="sr-only">Sort by</label>
            <select
              id="sort"
              className="field ml-auto w-auto text-sm"
              value={filters.sort || 'newest'}
              onChange={(e) => applyFilters({ ...filters, sort: e.target.value })}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Alert className="mb-4">{error}</Alert>

          {/* The cards' own titles are h3. Without this they nest under the
              filter rail's h2, which tells a screen-reader user the results
              are part of the filters. */}
          <h2 className="sr-only">
            {pageMeta?.total
              ? `${pageMeta.total} matching ${pageMeta.total === 1 ? 'property' : 'properties'}`
              : 'Results'}
          </h2>

          <ListingGrid
            listings={listings}
            loading={loading}
            count={6}
            empty={
              <EmptyState
                title="Nothing matches that search"
                action={
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  >
                    Clear filters
                  </button>
                }
              >
                {activeCount
                  ? 'Try removing a filter or two. The price range and bedroom count are usually the tightest.'
                  : 'There are no published properties yet.'}
              </EmptyState>
            }
          />

          {totalPages > 1 ? (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('page', page - 1);
                  setParams(next);
                }}
                className="btn-outline"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-dark-600 dark:text-dark-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('page', page + 1);
                  setParams(next);
                }}
                className="btn-outline"
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Browse;
