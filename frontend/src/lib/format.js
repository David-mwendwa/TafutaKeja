const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

export const money = (amount) => (Number.isFinite(amount) ? KES.format(amount) : '–');

/**
 * Prices on cards, where a five-bedroom in Karen and a bedsitter in Juja have
 * to sit in the same column. Written the way a Kenyan agent says it out loud —
 * "KES 4.2M", "KES 85K" — because the full figure is eight characters wider and
 * pushes the card layout around.
 */
/* Intl renders KES as "Ksh", so the abbreviated form has to say "Ksh" too —
 * otherwise a card reads "KES 140K/mo" and the page it opens reads
 * "Ksh 140,000/mo" for the same property. */
const SYMBOL = 'Ksh';

export const shortMoney = (amount) => {
  if (!Number.isFinite(amount)) return '–';
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${SYMBOL} ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${SYMBOL} ${k % 1 === 0 ? k : k.toFixed(0)}K`;
  }
  return KES.format(amount);
};

export const priceLabel = (listing) =>
  listing.purpose === 'rent'
    ? `${money(listing.price)}/${listing.rentPeriod === 'month' ? 'mo' : listing.rentPeriod}`
    : money(listing.price);

export const shortPriceLabel = (listing) =>
  listing.purpose === 'rent' ? `${shortMoney(listing.price)}/mo` : shortMoney(listing.price);

const SQM_PER_ACRE = 4046.86;

/** Land is spoken about in acres in Kenya; built space in square metres. */
export const sizeLabel = (listing) => {
  if (!listing.sizeSqm) return null;
  if (listing.propertyType === 'land') {
    const acres = listing.sizeSqm / SQM_PER_ACRE;
    return `${acres < 1 ? acres.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : acres.toFixed(2)} acres`;
  }
  return `${listing.sizeSqm} m²`;
};

export const bedLabel = (listing) => {
  if (listing.bedrooms === 0) return 'Bedsitter';
  if (!listing.bedrooms) return null;
  return `${listing.bedrooms} bed`;
};

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export const timeAgo = (value) => {
  if (!value) return '';
  const diff = new Date(value).getTime() - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return RELATIVE.format(Math.round(diff / ms), unit);
  }
  return 'just now';
};

export const longDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

export const titleCase = (value) =>
  typeof value === 'string' && value.length
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : value;
