/**
 * Kenyan listings quote land in acres and built space in square feet; the model
 * stores square metres so that one size filter can compare them. Conversion
 * happens on the way in, once, rather than at every read.
 */
const SQM_PER_ACRE = 4046.86;
const SQM_PER_SQFT = 0.092903;

export const UNITS = ['sqm', 'sqft', 'acres'];

export const toSqm = (value, unit = 'sqm') => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (unit === 'acres') return Math.round(n * SQM_PER_ACRE);
  if (unit === 'sqft') return Math.round(n * SQM_PER_SQFT);
  return Math.round(n);
};

export const sqmToAcres = (sqm) => Number((sqm / SQM_PER_ACRE).toFixed(2));
export const sqmToSqft = (sqm) => Math.round(sqm / SQM_PER_SQFT);
