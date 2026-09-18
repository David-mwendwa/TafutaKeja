/**
 * The seeded catalogue.
 *
 * A note on provenance, because it differs from the other projects in this
 * workspace: Talentifyx ingests real adverts from Arbeitnow and furniworld's
 * catalogue is real retailer stock. There is no free, open feed of Kenyan
 * property listings, so **these listings are synthetic** — composed here from
 * real places, real price bands and real photography. Nothing pretends to be a
 * property you could actually go and rent. What is real:
 *
 *   - the neighbourhoods, their coordinates and their price bands (data/areas.js)
 *   - the photographs (harvested from Unsplash, see scripts/fetchImages.mjs)
 *   - the shape of the market: what a bedsitter in Juja costs against a
 *     four-bedroom in Runda, which areas carry which property types, and which
 *     amenities are worth listing where
 *
 * Composed deterministically from a fixed seed rather than written out by hand,
 * so the catalogue can be regenerated and stays consistent between runs.
 */
import { AREAS, TIERS } from './areas.js';
import { AMENITIES } from '../constants/index.js';

/* A small deterministic PRNG (mulberry32). Math.random would give a different
 * catalogue every run, which makes a seeded demo impossible to reason about —
 * screenshots, tests and the portfolio thumbnail would all drift. */
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const pickMany = (rand, list, n) => {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(rand() * pool.length), 1));
  return out;
};
const between = (rand, min, max) => min + rand() * (max - min);

// Round to something an agent would actually write on a board: rents to the
// nearest thousand, asking prices to the nearest hundred thousand.
const roundRent = (n) => Math.round(n / 1000) * 1000;
const roundSale = (n) => Math.round(n / 100000) * 100000;

/* Which property types plausibly appear where. A bedsitter in Muthaiga and a
 * five-bedroom villa in Juja are the pairings that give a fake catalogue away. */
/* Bedroom counts a property type actually comes in. Without this the generator
 * produces a "1 bedroom maisonette" — a maisonette is multi-storey by
 * definition and effectively never has one bedroom — and a four-bedroom villa
 * in an area whose market is one- and two-bed apartments. Both are the kind of
 * detail that tells a Kenyan reader immediately that the catalogue is invented. */
const BEDROOMS_BY_TYPE = {
  bedsitter: [0, 0],
  studio: [0, 0],
  apartment: [1, 4],
  penthouse: [3, 5],
  maisonette: [3, 5],
  townhouse: [3, 5],
  bungalow: [2, 4],
  villa: [4, 6],
  house: [3, 6],
};

const TYPES_BY_TIER = {
  premium: ['villa', 'house', 'townhouse', 'maisonette'],
  high: ['house', 'villa', 'townhouse', 'maisonette', 'apartment'],
  upperMid: ['apartment', 'penthouse', 'townhouse', 'maisonette'],
  mid: ['apartment', 'maisonette', 'bungalow', 'townhouse'],
  affordable: ['apartment', 'bedsitter', 'studio', 'bungalow'],
  commuter: ['apartment', 'bedsitter', 'studio', 'bungalow', 'maisonette'],
};

/* Floor area a home of each size actually has, in square metres. A flat
 * "bedrooms x 50" put a two-bedroom in Kitengela at 137m2 against a real market
 * of about 70-85 — the kind of number that reads as obviously invented to
 * anyone who has rented one. */
const SIZE_BY_BEDROOMS = {
  0: [20, 32],
  1: [42, 62],
  2: [70, 95],
  3: [105, 145],
  4: [150, 220],
  5: [220, 320],
  6: [280, 400],
};

/* Space costs money, so the same bedroom count buys more of it further up the
 * market: a three-bedroom in Runda is genuinely larger than one in Juja. */
const SIZE_FACTOR_BY_TIER = {
  premium: 1.25,
  high: 1.15,
  upperMid: 1.0,
  mid: 0.95,
  affordable: 0.9,
  commuter: 0.9,
};

const AMENITIES_BY_TIER = {
  premium: ['Borehole water', 'Backup generator', '24/7 security', 'Electric fence', 'Swimming pool', 'DSQ', 'Private garden', 'Covered parking', 'CCTV', 'Gated community', 'En-suite bedrooms', 'Walk-in closet', 'Solar water heating', 'Fibre internet ready'],
  high: ['Borehole water', 'Backup generator', '24/7 security', 'Electric fence', 'DSQ', 'Private garden', 'Covered parking', 'CCTV', 'Gated community', 'En-suite bedrooms', 'Fibre internet ready', "Children's play area"],
  upperMid: ['Borehole water', 'Lift', 'Gym', 'Swimming pool', 'CCTV', '24/7 security', 'Covered parking', 'Balcony', 'Backup generator', 'Fibre internet ready', 'En-suite bedrooms', 'Rooftop terrace'],
  mid: ['Borehole water', 'CCTV', '24/7 security', 'Covered parking', 'Balcony', 'Gated community', 'Fibre internet ready', "Children's play area", 'Visitor parking'],
  affordable: ['Borehole water', 'CCTV', '24/7 security', 'Gated community', 'Visitor parking', 'Fibre internet ready', 'Balcony'],
  commuter: ['Borehole water', 'CCTV', 'Gated community', 'Visitor parking', 'Fibre internet ready', 'Balcony', 'Pet friendly'],
};

const TYPE_LABEL = {
  bedsitter: 'bedsitter', studio: 'studio apartment', apartment: 'apartment',
  maisonette: 'maisonette', bungalow: 'bungalow', townhouse: 'townhouse',
  villa: 'villa', penthouse: 'penthouse', house: 'house',
  land: 'plot', commercial: 'commercial unit',
};

/* Land needs its own openers. The building set produced "Recently painted plot"
 * and "Bright, generously proportioned plot" — every one of them assumes rooms,
 * paint and light, none of which a bare plot has. */
const LAND_OPENERS = [
  'A level {type} on the edge of {area}, fenced and ready to build on',
  'Well-positioned {type} in a fast-developing part of {area}',
  'Regular-shaped {type} in {area} with a maintained access road',
  'Gently sloping {type} on the {area} side, with mains power at the boundary',
  'Corner {type} in {area}, fenced and with a gate already in place',
];

const COMMERCIAL_OPENERS = [
  'Ground-floor {type} on a busy stretch of {area}',
  'Well-presented {type} in an established {area} block',
  'Flexible {type} in {area}, suited to an office or a showroom',
  'Roadside {type} in {area} with its own parking',
];

const OPENERS = [
  'A well-kept {type} on a quiet stretch of {area}',
  'Bright, generously proportioned {type} in the heart of {area}',
  'Newly refurbished {type} a short walk from the main {area} shops',
  'Spacious {type} set back from the road in {area}',
  'Modern {type} in one of {area}\'s better-managed blocks',
  'Corner {type} in {area} with good light on three sides',
  'Family-sized {type} in a settled part of {area}',
  'Recently painted {type} on a well-maintained {area} compound',
];

const INTERIOR_NOTES = [
  'The living area opens onto the balcony and holds a six-seater comfortably.',
  'Open-plan lounge and dining, with the kitchen partly separated by a breakfast counter.',
  'Large windows through the main rooms, so it stays bright well into the afternoon.',
  'The kitchen is fitted with hardwood units and has space for a full-size fridge.',
  'Tiled throughout, with wardrobes fitted in every bedroom.',
  'The master is en-suite and takes a king bed with room to spare.',
  'High ceilings and a wide hallway give it more air than the floor plan suggests.',
  'Recently rewired, with sockets brought up to a sensible number in every room.',
];

const BUILDING_NOTES = [
  'The compound is gated with a manned gate and a borehole backing up the county supply.',
  'Water has never been an issue here: borehole plus storage tanks on the roof.',
  'Parking is covered and allocated, with visitor bays by the gate.',
  'There is a lift, and the block has a standby generator for the common areas.',
  'Management is on site and the service charge covers water, security and grounds.',
  'The estate has a play area and a small gym in the clubhouse.',
  'Perimeter wall is electric-fenced and there are cameras on the approach.',
];

/* Land closes differently from a building. The sale set includes lines about
 * rental history and vacant possession of a dwelling, which on a bare plot read
 * as nonsense — "it has let consistently for the last three years" about an
 * empty quarter-acre. */
const LAND_CLOSERS = [
  'Clean title deed, ready for transfer. Searches can be done before you commit.',
  'Ready for transfer, with the survey map and beacons already in place.',
  'Owner is selling to settle another project and will consider a reasonable offer.',
  'Viewings any day. The caretaker on site will open the gate for you.',
];

const CLOSERS = {
  rent: [
    'Available immediately. Deposit and one month up front.',
    'Viewings from Monday to Saturday. Call ahead and we will meet you at the gate.',
    'Tenant pays water and electricity; service charge is included in the rent.',
    'Available from the start of next month. Serious enquiries only, please.',
    'Flexible on the move-in date for the right tenant.',
  ],
  sale: [
    'Clean title deed, ready for transfer. Financing can be arranged through the usual banks.',
    'Owner is motivated and will consider a reasonable offer.',
    'Title is ready and the property is vacant, so possession is immediate.',
    'Sold with vacant possession. All searches can be done before you commit.',
    'Rental history available on request. It has let consistently for the last three years.',
  ],
};

/* Deliberately complementary to LAND_OPENERS rather than overlapping it. The
 * openers cover shape, fencing and access; these cover soil, services, title
 * and what is going up nearby — otherwise a description reads "Corner plot,
 * fenced and gated. Level plot, fully fenced, with a gate already in place." */
const LAND_NOTES = [
  'Red volcanic soil, and the water table is shallow enough that a borehole is straightforward.',
  'Mains water and three-phase power are both at the boundary, so servicing it is a short job.',
  'Clean title deed, already subdivided, and the rates are paid up to date.',
  'Zoned residential, with a controlled development in progress on the neighbouring parcel.',
  'The neighbours have built, so the road, power and water are all in and maintained.',
  'Black cotton soil, so budget for foundations. It is priced with that in mind.',
];

const COMMERCIAL_NOTES = [
  'Ground-floor unit with full glass frontage and its own entrance.',
  'Open-plan office floor, partitioned into four offices and a boardroom.',
  'Retail space on a busy pedestrian stretch, with parking directly outside.',
  'Warehouse-height unit with a roller shutter and three-phase power.',
];

/**
 * Builds the catalogue.
 *
 * @param {object} photos the committed manifest from data/photos.json
 * @param {number} count how many listings to produce
 */
export const buildListings = (photos, count = 72) => {
  const rand = rng(20260912);
  const listings = [];

  // Lead photographs are handed out without replacement so that no two
  // listings open with the same picture — the single thing that makes a seeded
  // catalogue look fake at a glance.
  const leads = {
    house: [...photos.exterior],
    apartment: [...photos.apartment],
    land: [...photos.land],
    commercial: [...photos.commercial],
  };
  const interiors = [...photos.living, ...photos.bedroom, ...photos.kitchen, ...photos.bathroom];
  const outdoors = [...photos.outdoor];
  let interiorCursor = 0;
  let outdoorCursor = 0;

  const takeLead = (bucket) => {
    const pool = leads[bucket];
    return pool.length ? pool.shift() : null;
  };

  // Spread listings across areas proportionally: the dense apartment markets
  // carry more stock than the premium suburbs, which is how the real market
  // looks and what makes the browse filters worth using.
  const weightFor = (tier) =>
    ({ premium: 1, high: 2, upperMid: 4, mid: 3, affordable: 3, commuter: 3 })[tier] ?? 2;
  const slots = [];
  for (const area of AREAS) for (let i = 0; i < weightFor(area.tier); i += 1) slots.push(area);

  for (let i = 0; i < count; i += 1) {
    const area = slots[Math.floor(rand() * slots.length)];
    const tier = area.tier;

    // One in nine listings is land or commercial rather than a home.
    const special = rand();
    const isLand = special > 0.94;
    const isCommercial = !isLand && special > 0.89;

    // A type is only usable here if the area's price band covers a bedroom
    // count that type comes in — otherwise there is no honest price to quote.
    const areaSizes = Object.keys(area.rentPerBedroom).map(Number);
    const fitsArea = (type) => {
      const [lo, hi] = BEDROOMS_BY_TYPE[type];
      return areaSizes.some((b) => b >= lo && b <= hi);
    };
    const usable = TYPES_BY_TIER[tier].filter(fitsArea);
    const propertyType = isLand ? 'land'
      : isCommercial ? 'commercial'
      : pick(rand, usable.length ? usable : ['apartment']);

    const purpose = isLand ? 'sale' : rand() > (tier === 'premium' ? 0.45 : 0.68) ? 'sale' : 'rent';

    // Bedrooms have to be a size the area actually offers, or the price band
    // has nothing to say about it.
    const available = Object.keys(area.rentPerBedroom).map(Number).sort((a, b) => a - b);
    let bedrooms = null;
    let bathrooms = null;
    if (!isLand && !isCommercial) {
      const [lo, hi] = BEDROOMS_BY_TYPE[propertyType];
      const candidates = available.filter((b) => b >= lo && b <= hi);
      bedrooms = candidates.length
        ? pick(rand, candidates)
        : Math.max(lo, Math.min(hi, available[available.length - 1]));
      bathrooms = bedrooms === 0 ? 1 : Math.max(1, Math.min(bedrooms, Math.round(bedrooms * between(rand, 0.6, 1.05))));
    }

    // Price: the area's band for that size, varied by ±18%, then converted to
    // an asking price for sales using the tier's yield multiple.
    const baseRent = area.rentPerBedroom[bedrooms] ?? area.rentPerBedroom[available[available.length - 1]];
    let price;
    let sizeSqm;
    if (isLand) {
      const acres = pick(rand, [0.125, 0.25, 0.25, 0.5, 1]);
      sizeSqm = Math.round(acres * 4046.86);
      // Priced per acre from the tier's own land rate. Deriving it from monthly
      // rent instead put an eighth-acre in Rongai at KES 300,000, against a
      // real market of roughly 1.5-2.5 million — rent and land prices simply do
      // not move together closely enough to infer one from the other.
      price = roundSale(acres * TIERS[tier].landPerAcre * between(rand, 0.8, 1.2));
    } else if (isCommercial) {
      sizeSqm = Math.round(between(rand, 45, 400));
      price = purpose === 'rent'
        ? roundRent(sizeSqm * between(rand, 80, 220))
        : roundSale(sizeSqm * between(rand, 80, 220) * TIERS[tier].saleMultiple);
    } else {
      const perBed = baseRent * between(rand, 0.84, 1.18);
      price = purpose === 'rent' ? roundRent(perBed) : roundSale(perBed * TIERS[tier].saleMultiple);
      const [minSqm, maxSqm] = SIZE_BY_BEDROOMS[bedrooms] || SIZE_BY_BEDROOMS[3];
      sizeSqm = Math.round(
        between(rand, minSqm, maxSqm) * (SIZE_FACTOR_BY_TIER[tier] ?? 1)
      );
    }

    // Photographs: a lead that matches the property, then interiors.
    const leadBucket = isLand ? 'land'
      : isCommercial ? 'commercial'
      : ['apartment', 'penthouse', 'studio', 'bedsitter'].includes(propertyType) ? 'apartment'
      : 'house';
    const lead = takeLead(leadBucket) || takeLead('house') || takeLead('apartment');

    const images = lead ? [{ url: `/images/listings/${lead.file}`, alt: `${TYPE_LABEL[propertyType]} in ${area.area}` }] : [];
    if (!isLand) {
      const extras = isCommercial ? 1 : 3;
      for (let n = 0; n < extras; n += 1) {
        const photo = interiors[interiorCursor % interiors.length];
        interiorCursor += 1;
        images.push({ url: `/images/listings/${photo.file}`, alt: `Interior of the ${TYPE_LABEL[propertyType]} in ${area.area}` });
      }
      if (['villa', 'house', 'townhouse', 'bungalow'].includes(propertyType)) {
        const photo = outdoors[outdoorCursor % outdoors.length];
        outdoorCursor += 1;
        images.push({ url: `/images/listings/${photo.file}`, alt: `Garden at the ${TYPE_LABEL[propertyType]} in ${area.area}` });
      }
    }

    const label = TYPE_LABEL[propertyType];
    const sizeLabel = bedrooms === 0 ? '' : bedrooms ? `${bedrooms} bedroom ` : '';
    const title = isLand
      ? `${(sizeSqm / 4046.86).toFixed(sizeSqm / 4046.86 < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '')} acre plot in ${area.area}`
      : `${sizeLabel}${label} ${purpose === 'rent' ? 'to let' : 'for sale'} in ${area.area}`;

    const openerPool = isLand ? LAND_OPENERS : isCommercial ? COMMERCIAL_OPENERS : OPENERS;
    const opener = pick(rand, openerPool).replace('{type}', label).replace('{area}', area.area);
    const body = isLand
      ? [pick(rand, LAND_NOTES), area.blurb]
      : isCommercial
      ? [pick(rand, COMMERCIAL_NOTES), area.blurb]
      : [pick(rand, INTERIOR_NOTES), pick(rand, BUILDING_NOTES), area.blurb];
    const closerPool = isLand ? LAND_CLOSERS : CLOSERS[purpose];
    const description = [`${opener}. ${body[0]}`, ...body.slice(1), pick(rand, closerPool)].join('\n\n');

    const amenityPool = AMENITIES_BY_TIER[tier].filter((a) => AMENITIES.includes(a));
    const amenities = isLand ? [] : pickMany(rand, amenityPool, Math.round(between(rand, 3, Math.min(9, amenityPool.length))));

    // Scatter the pin within roughly a kilometre of the area centre so a map of
    // one neighbourhood is not a single stack of overlapping markers.
    const jitter = () => (rand() - 0.5) * 0.018;

    listings.push({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description,
      purpose,
      propertyType,
      price,
      ...(purpose === 'rent' ? { rentPeriod: 'month', depositMonths: pick(rand, [1, 1, 2, 2, 3]) } : {}),
      ...(purpose === 'rent' && !isLand && rand() > 0.55
        ? { serviceCharge: roundRent(price * between(rand, 0.05, 0.12)) }
        : {}),
      negotiable: rand() > 0.7,
      ...(bedrooms === null ? {} : { bedrooms, bathrooms }),
      parkingSpaces: isLand ? 0 : Math.min(3, Math.max(0, Math.round(between(rand, bedrooms ? 0.5 : 0, (bedrooms || 1) * 0.8)))),
      sizeSqm,
      furnishing: isLand || isCommercial ? 'unfurnished' : pick(rand, ['unfurnished', 'unfurnished', 'unfurnished', 'semi-furnished', 'furnished']),
      amenities,
      location: {
        county: area.county,
        area: area.area,
        geo: { type: 'Point', coordinates: [area.coords[0] + jitter(), area.coords[1] + jitter()] },
      },
      images,
    });
  }

  return listings;
};
