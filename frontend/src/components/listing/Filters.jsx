import { useEffect, useState } from 'react';
import { titleCase } from '../../lib/format.js';

const PRICE_STEPS = {
  rent: [10000, 25000, 50000, 100000, 200000, 400000],
  sale: [1000000, 5000000, 15000000, 30000000, 60000000, 120000000],
};

const Section = ({ title, children }) => (
  <div className="border-b border-dark-200 py-4 last:border-0 dark:border-dark-800">
    <h3 className="mb-3 text-sm font-bold text-dark-800 dark:text-dark-200">{title}</h3>
    {children}
  </div>
);

/**
 * The filter rail.
 *
 * Its vocabulary comes from `GET /listings/meta` rather than being written out
 * here. A chip the UI offers that the API does not honour is a filter that
 * silently does nothing, and that is invisible in review — it looks like there
 * simply are no matching properties.
 */
export const Filters = ({ meta, value, onChange, onReset }) => {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  const set = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const toggleInList = (key, item) => {
    const current = local[key] ? local[key].split(',').filter(Boolean) : [];
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    set({ [key]: next.join(',') });
  };

  const inList = (key, item) => (local[key] || '').split(',').includes(item);
  const steps = PRICE_STEPS[local.purpose === 'sale' ? 'sale' : 'rent'];

  return (
    /*
     * The group headings are h3, so the rail needs its own h2 or the page
     * jumps h1 → h3 and a screen-reader user loses the nesting. It is also
     * what gives this region a name in a landmark list, which is why it is
     * `sr-only` rather than absent.
     */
    <section aria-labelledby="filters-heading" className="card px-4 py-2">
      <h2 id="filters-heading" className="sr-only">
        Filters
      </h2>
      <Section title="I want to">
        <div className="flex gap-2">
          {[
            ['rent', 'Rent'],
            ['sale', 'Buy'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              // Price bands are an order of magnitude apart between renting and
              // buying, so a min/max carried across the switch would filter
              // everything out. Cleared with the switch instead.
              onClick={() =>
                set({
                  purpose: local.purpose === val ? '' : val,
                  minPrice: '',
                  maxPrice: '',
                })
              }
              className={`chip flex-1 justify-center py-2 ${local.purpose === val ? 'chip-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Price">
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="minPrice">Minimum price</label>
          <select
            id="minPrice"
            className="field text-sm"
            value={local.minPrice || ''}
            onChange={(e) => set({ minPrice: e.target.value })}
          >
            <option value="">No min</option>
            {steps.map((s) => (
              <option key={s} value={s}>
                {s.toLocaleString('en-KE')}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="maxPrice">Maximum price</label>
          <select
            id="maxPrice"
            className="field text-sm"
            value={local.maxPrice || ''}
            onChange={(e) => set({ maxPrice: e.target.value })}
          >
            <option value="">No max</option>
            {steps.map((s) => (
              <option key={s} value={s}>
                {s.toLocaleString('en-KE')}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Bedrooms">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ bedrooms: String(local.bedrooms) === String(n) ? '' : n })}
              className={`chip ${String(local.bedrooms) === String(n) ? 'chip-active' : ''}`}
            >
              {n}+
            </button>
          ))}
        </div>
      </Section>

      <Section title="Property type">
        <div className="flex flex-wrap gap-2">
          {(meta?.propertyTypes || []).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleInList('propertyType', type)}
              className={`chip ${inList('propertyType', type) ? 'chip-active' : ''}`}
            >
              {titleCase(type)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="County">
        <label className="sr-only" htmlFor="county">County</label>
        <select
          id="county"
          className="field text-sm"
          value={local.county || ''}
          onChange={(e) => set({ county: e.target.value })}
        >
          <option value="">Anywhere in Kenya</option>
          {(meta?.counties || []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Must have">
        <div className="flex flex-wrap gap-2">
          {(meta?.amenities || []).slice(0, 12).map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleInList('amenities', amenity)}
              className={`chip ${inList('amenities', amenity) ? 'chip-active' : ''}`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </Section>

      <div className="py-4">
        <button type="button" onClick={onReset} className="btn-outline w-full">
          Clear all filters
        </button>
      </div>
    </section>
  );
};

export default Filters;
