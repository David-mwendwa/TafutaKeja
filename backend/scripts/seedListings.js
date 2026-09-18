/**
 * Seeds the agents and the property catalogue.
 *
 *   npm run seed
 *
 * Destructive for listings and seeded agent accounts; it leaves any other user
 * alone, so re-seeding the catalogue does not wipe accounts created by hand
 * while working on the app.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import User from '../models/userModel.js';
import Listing from '../models/listingModel.js';
import Enquiry from '../models/enquiryModel.js';
import SavedListing from '../models/savedListingModel.js';
import { AGENTS } from '../data/agents.js';
import { buildListings } from '../data/listings.js';
import { MODERATION_REASONS } from '../constants/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB = process.env.DATABASE_URL || process.env.MONGO_URI;
if (!DB) {
  console.error('No database connection string set (DATABASE_URL)');
  process.exit(1);
}

await mongoose.connect(DB);
console.log(`connected: ${mongoose.connection.name}`);

const photos = JSON.parse(
  await readFile(path.join(__dirname, '..', 'data', 'photos.json'), 'utf8')
);

const seededEmails = AGENTS.map((a) => a.email);

await Listing.deleteMany({});
await Enquiry.deleteMany({});
await SavedListing.deleteMany({});
await User.deleteMany({ email: { $in: seededEmails } });
console.log('cleared listings, enquiries, saved rows and seeded agents');

const agents = await User.create(
  AGENTS.map((agent) => ({
    name: agent.name,
    email: agent.email,
    password: 'agent12345',
    phone: agent.phone,
    whatsapp: agent.whatsapp,
    agencyName: agent.agencyName || undefined,
    bio: agent.bio,
    verified: agent.verified,
    role: 'agent',
  }))
);
console.log(`${agents.length} agents created`);

const agentByEmail = Object.fromEntries(agents.map((a) => [a.email, a]));
const byArea = new Map();
for (const spec of AGENTS)
  for (const area of spec.areas) byArea.set(area, agentByEmail[spec.email]);
const fallback = agentByEmail['samuel@tafutakeja.ke'];

const listings = buildListings(photos, 72);

/*
 * Statuses are spread on purpose. Most of the catalogue is live, because a
 * marketplace with nothing to browse is not a demo; the rest is what gives the
 * agent dashboard and the moderation queue something to act on. The unverified
 * agent's listings are the ones left pending.
 */
/*
 * The independent agent carries the whole lifecycle, not just the start of it.
 * He used to hold nothing but drafts and pending listings, which left three
 * screens with nothing to show: his dashboard never demonstrated a live advert,
 * the "Rejected" tab and the rejection notice under a listing were unreachable
 * from every account, and the moderation queue's rejected filter was
 * permanently empty.
 */
const INDEPENDENT_LIFECYCLE = [
  'published', 'pending', 'draft', 'rejected', 'pending', 'published', 'rejected',
];
let independent = 0;

let published = 0;
let pending = 0;
let draft = 0;
let rejected = 0;
let taken = 0;

const docs = [];
for (const [index, listing] of listings.entries()) {
  // Every area is claimed by one of the specialists, so the independent agent
  // would otherwise end up with nothing and the moderation queue would have
  // only the odd listing an established agency happened to resubmit. He works
  // across Nairobi, so he takes a slice regardless of area.
  const agent = index % 11 === 5 ? fallback : byArea.get(listing.location.area) || fallback;

  let status = 'published';
  if (agent.email === fallback.email) {
    // Walked in order rather than derived from the global index, so his share
    // is exactly this and does not move when the catalogue size changes.
    status = INDEPENDENT_LIFECYCLE[independent % INDEPENDENT_LIFECYCLE.length];
    independent += 1;
  } else if (index % 9 === 0) {
    status = 'pending';
  } else if (index % 23 === 0) {
    status = listing.purpose === 'rent' ? 'let' : 'sold';
  }

  if (status === 'published') published += 1;
  else if (status === 'pending') pending += 1;
  else if (status === 'draft') draft += 1;
  else if (status === 'rejected') rejected += 1;
  else taken += 1;

  // Spread publication over the last four months so "newest first" has
  // something to sort by and the staleness rule has old listings to catch.
  const daysAgo = Math.round((index * 137) % 120);
  const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  docs.push({
    ...listing,
    agent: agent._id,
    status,
    featured: false,
    // A rejection an agent cannot read is no use to them: the dashboard shows
    // this reason back, and it is what tells them what to fix.
    ...(status === 'rejected'
      ? { moderation: { reason: MODERATION_REASONS[index % MODERATION_REASONS.length], reviewedAt: new Date() } }
      : {}),
    ...(status === 'published' || status === 'let' || status === 'sold'
      ? { publishedAt }
      : {}),
    // Seeded, not `Math.random`: the catalogue is meant to be reproducible from
    // a fixed seed, and the landing page now orders estates by these.
    views: status === 'published' ? Math.round(((index * 2654435761) % 397) + 3) : 0,
  });
}

/*
 * Featured listings are chosen, not rolled.
 *
 * A per-listing `rand() > 0.88` gave whatever it gave: five, by chance all of
 * them rentals, which left a third of the catalogue with no showing on the
 * landing page and the featured grid one card short of a clean row. The page
 * opens on three of these and grids the next six, so the set has to be at least
 * nine, has to hold both purposes, and should not be three flats in one estate.
 */
const FEATURED_TOTAL = 9;
const FEATURED_SALE = 3;

const pickFeatured = () => {
  const eligible = docs.filter((d) => d.status === 'published' && d.images?.length);
  const chosen = [];
  const usedAreas = new Set();

  const take = (purpose, want) => {
    // Best-looking first, by the same view count the estates panel sorts on,
    // then one pass allowing a repeated area so a thin purpose still fills.
    const pool = eligible
      .filter((d) => d.purpose === purpose && !chosen.includes(d))
      .sort((a, b) => b.views - a.views);
    for (const spread of [true, false]) {
      for (const doc of pool) {
        if (chosen.length >= want) return;
        if (chosen.includes(doc)) continue;
        if (spread && usedAreas.has(doc.location.area)) continue;
        chosen.push(doc);
        usedAreas.add(doc.location.area);
      }
    }
  };

  take('sale', FEATURED_SALE);
  take('rent', FEATURED_TOTAL);
  return chosen;
};

const featured = pickFeatured();
for (const doc of featured) doc.featured = true;

// Created one at a time rather than with insertMany: the slug is generated in a
// pre-save hook, and insertMany skips document middleware, which would leave
// every listing without one and every listing URL 404ing.
const created = [];
for (const doc of docs) created.push(await Listing.create(doc));

console.log(
  `${created.length} listings: ${published} published, ${pending} pending, ${draft} draft, ${rejected} rejected, ${taken} let/sold`
);
console.log(
  `featured: ${featured.length} (${featured.filter((d) => d.purpose === 'sale').length} for sale) across ${new Set(featured.map((d) => d.location.area)).size} estates`
);
console.log(`slugs generated: ${created.filter((l) => l.slug).length}/${created.length}`);
console.log(`with coordinates: ${created.filter((l) => l.location?.geo?.coordinates?.length === 2).length}`);

await mongoose.disconnect();
console.log('done. next: npm run seed:demo');
