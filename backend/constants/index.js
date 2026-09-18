// Domain vocabulary for the whole API. Anything the frontend also needs to
// render (filter chips, dropdowns, status badges) is exported from here and
// served by `GET /api/v1/listings/meta`, so the two halves cannot drift.

export const ROLES = ['user', 'agent', 'admin'];

// What the occupier is being offered. Kept separate from `propertyType` because
// the same maisonette can be listed either way and the price means something
// different in each case.
export const PURPOSES = ['rent', 'sale'];

export const PROPERTY_TYPES = [
  'bedsitter',
  'studio',
  'apartment',
  'maisonette',
  'bungalow',
  'townhouse',
  'villa',
  'penthouse',
  'house',
  'land',
  'commercial',
];

// Types that have no bedrooms or bathrooms to speak of. The listing form hides
// those fields for these, and the validator stops requiring them.
export const ROOMLESS_TYPES = ['land', 'commercial'];

export const AMENITIES = [
  'Borehole water',
  'Backup generator',
  'Lift',
  'Gym',
  'Swimming pool',
  'CCTV',
  'Electric fence',
  'Gated community',
  '24/7 security',
  'Covered parking',
  'Visitor parking',
  'Balcony',
  'DSQ',
  'Private garden',
  "Children's play area",
  'Solar water heating',
  'Fibre internet ready',
  'En-suite bedrooms',
  'Walk-in closet',
  'Wheelchair access',
  'Pet friendly',
  'Furnished',
  'Borehole backup',
  'Rooftop terrace',
];

export const FURNISHING = ['unfurnished', 'semi-furnished', 'furnished'];

// Rent is quoted per month almost everywhere in Kenya; the exceptions are
// short-lets and commercial space, so the period is stored rather than assumed.
export const RENT_PERIODS = ['month', 'week', 'day', 'year'];

export const LISTING_STATUSES = [
  'draft',
  'pending',
  'published',
  'rejected',
  'let',
  'sold',
  'archived',
];

// The only status changes the API will make. Exported so the agent dashboard and
// the admin queue can render exactly the buttons that will actually work,
// rather than each re-deriving the rules and drifting from them.
export const LISTING_TRANSITIONS = {
  draft: ['pending', 'archived'],
  pending: ['published', 'rejected', 'draft'],
  published: ['let', 'sold', 'archived'],
  rejected: ['pending', 'draft', 'archived'],
  let: ['published', 'archived'],
  sold: ['published', 'archived'],
  archived: ['draft'],
};

// Who is allowed to move a listing into a given status. Approving is the
// moderator's call; taking a property off the market is the agent's.
export const TRANSITION_ROLES = {
  pending: ['agent', 'admin'],
  published: ['admin'],
  rejected: ['admin'],
  draft: ['agent', 'admin'],
  let: ['agent', 'admin'],
  sold: ['agent', 'admin'],
  archived: ['agent', 'admin'],
};

// A listing is only on the market — and only indexable — in this state.
export const PUBLIC_STATUS = 'published';

// Taken properties keep their page (the link is already out there, and a dead
// URL is worse than an honest one) but must stop advertising themselves to
// search: no structured data, an explicit noindex, and a notice to the reader.
export const OFF_MARKET_STATUSES = ['let', 'sold'];

// Nothing expires a property the way a job advert expires, but a listing nobody
// has touched in six months is usually gone. Past this we show the reader when
// it was last confirmed rather than silently implying it is current.
export const LISTING_STALE_DAYS = 180;

export const ENQUIRY_STATUSES = ['new', 'replied', 'closed'];

export const MODERATION_REASONS = [
  'Photos do not match the description',
  'Price appears unrealistic',
  'Duplicate of an existing listing',
  'Incomplete or missing details',
  'Location cannot be verified',
  'Suspected scam',
  'Other',
];

export const COUNTIES = [
  'Nairobi',
  'Kiambu',
  'Kajiado',
  'Machakos',
  'Mombasa',
  'Kilifi',
  'Nakuru',
  'Kisumu',
  'Uasin Gishu',
  'Nyeri',
];

export const CURRENCY = 'KES';
