/**
 * Seeds the accounts a reader signs in as, and the saved properties and
 * enquiry threads that make the signed-in screens worth looking at.
 *
 *   npm run seed:demo        (after npm run seed)
 *
 * The point is that every role has something to do. An empty inbox, an empty
 * saved list and a dashboard of drafts all render as "did this even work?", and
 * those are the screens that show what the app actually is. So: house hunters
 * outnumber agents the way they do in a real market, every agent has people
 * asking about their properties, and the conversations sit at different stages
 * rather than all being unanswered.
 *
 * Re-runnable on its own: it clears the rows it owns before writing.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

import User from '../models/userModel.js';
import Listing from '../models/listingModel.js';
import Enquiry from '../models/enquiryModel.js';
import SavedListing from '../models/savedListingModel.js';
import { THREADS } from '../data/enquiryThreads.js';

const DB = process.env.DATABASE_URL || process.env.MONGO_URI;
if (!DB) {
  console.error('No database connection string set (DATABASE_URL)');
  process.exit(1);
}

/* Deterministic, for the same reason the catalogue is: a demo you cannot
 * reproduce is a demo you cannot reason about when something looks wrong. */
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = rng(20260918);
const pick = (list) => list[Math.floor(rand() * list.length)];

await mongoose.connect(DB);
console.log(`connected: ${mongoose.connection.name}`);

// --- accounts ----------------------------------------------------------------

const SIGN_IN = [
  { name: 'Demo User', email: 'demo@tafutakeja.ke', password: 'demo12345', phone: '0712000111', role: 'user' },
  { name: 'Site Admin', email: 'admin@tafutakeja.ke', password: 'admin12345', phone: '0712000222', role: 'admin' },
];

/*
 * The other house hunters.
 *
 * They exist so enquiries come from a spread of real accounts rather than one
 * person writing to eight agents, and so the admin's user list looks like a
 * marketplace: before this it held eight agents and a single hunter, which is
 * the wrong way round and made the roles filter pointless.
 */
const HUNTERS = [
  ['Achieng Otieno', '0722410883'], ['Brian Kimani', '0733518204'],
  ['Cynthia Wambui', '0720664197'], ['Dennis Mutua', '0711283640'],
  ['Esther Njoroge', '0726905517'], ['Felix Barasa', '0715440928'],
  ['Grace Chebet', '0708317265'], ['Hassan Abdi', '0721558370'],
  ['Irene Wanjala', '0734260819'], ['James Kariuki', '0719073482'],
  ['Lydia Akinyi', '0727614059'], ['Martin Ochieng', '0713892746'],
  ['Naomi Cherono', '0705238164'], ['Peter Mwangi', '0731470295'],
].map(([name, phone]) => ({
  name,
  email: `${name.split(' ')[0].toLowerCase()}@example.ke`,
  password: 'hunter12345',
  phone,
  role: 'user',
}));

const emails = [...SIGN_IN, ...HUNTERS].map((a) => a.email);
await User.deleteMany({ email: { $in: emails } });
// Everything below belongs to this script, so it is rebuilt rather than added
// to. Without this a second run trips the one-thread-per-person index.
await Promise.all([
  Enquiry.deleteMany({}),
  SavedListing.deleteMany({}),
  Listing.updateMany({ enquiryCount: { $gt: 0 } }, { enquiryCount: 0 }),
]);

const [demo] = await User.create(SIGN_IN);
const hunters = await User.create(HUNTERS);
console.log(`${SIGN_IN.length} sign-in accounts, ${hunters.length} house hunters`);

// --- saved properties --------------------------------------------------------

const published = await Listing.find({ status: 'published' });

// A spread across areas and price points, as a real house hunt looks, not six
// near-identical flats.
const DEMO_SAVED = [
  [0, 'Ask whether the service charge covers water.'],
  [4, 'Good light, but check the parking situation.'],
  [9, null],
  [14, 'Viewing booked for Saturday morning.'],
  [21, null],
  [28, 'Closest to the office, 20 minutes on a good day.'],
  [35, 'Landlord may take 2 months deposit instead of 3.'],
];

const savedRows = DEMO_SAVED.filter(([i]) => published[i]).map(([i, note]) => ({
  user: demo._id,
  listing: published[i]._id,
  ...(note ? { note } : {}),
}));

/* The other hunters save too. Nobody but them sees it, but it is what the
 * saved-count badge and the per-listing save counts are made of, and a
 * catalogue where one account has saved everything is not a market. */
for (const hunter of hunters) {
  const seen = new Set();
  const howMany = 2 + Math.floor(rand() * 5);
  for (let n = 0; n < howMany; n += 1) {
    const listing = pick(published);
    if (seen.has(String(listing._id))) continue;
    seen.add(String(listing._id));
    savedRows.push({ user: hunter._id, listing: listing._id });
  }
}
await SavedListing.insertMany(savedRows);
console.log(`${savedRows.length} saved properties across ${hunters.length + 1} accounts`);

// --- enquiries ---------------------------------------------------------------

/*
 * Walked agent by agent rather than sprayed over the catalogue, because the
 * screen this is for is one agent's inbox. Spraying leaves some agents with
 * nine conversations and others with none, and the one you happen to sign in as
 * is the one that looks broken.
 */
const byAgent = new Map();
for (const listing of published) {
  const key = String(listing.agent);
  if (!byAgent.has(key)) byAgent.set(key, []);
  byAgent.get(key).push(listing);
}

const askers = [demo, ...hunters];
let threads = 0;
let unanswered = 0;

/*
 * The account people actually sign in as gets its threads on purpose rather
 * than from the shuffle below.
 *
 * Two of them end with the agent speaking, so the demo house hunter opens the
 * app with an unread badge and something to read. Left to chance, whether that
 * badge appears at all depended on which templates the shuffle handed them, and
 * on one run it handed them none.
 */
const demoOpeners = THREADS.filter((t) => t.replies.at(-1)?.from === 'agent').slice(0, 2);
const demoPicks = [published[0], published[4], published[9]].filter(Boolean);

for (const [i, listing] of demoPicks.entries()) {
  const template = demoOpeners[i] || THREADS.find((t) => t.fits(listing) && !t.replies.length);
  if (!template) continue;
  const last = template.replies.at(-1);
  await Enquiry.create({
    listing: listing._id,
    sender: demo._id,
    agent: listing.agent,
    message: template.message,
    phone: demo.phone,
    status: template.status,
    readByAgent: template.replies.length > 0,
    readBySender: last?.from !== 'agent',
    replies: template.replies.map((r) => ({
      author: r.from === 'agent' ? listing.agent : demo._id,
      body: r.body,
    })),
  });
  await Listing.updateOne({ _id: listing._id }, { $inc: { enquiryCount: 1 } });
  threads += 1;
  if (!template.replies.length) unanswered += 1;
}

for (const [, listings] of byAgent) {
  // Up to two conversations on the same property, because a listing people are
  // actually interested in gets asked about more than once, and one thread per
  // listing caps an agent's inbox at however many properties they happen to run.
  const want = Math.min(listings.length * 2, 6 + Math.floor(rand() * 4));
  const perListing = new Map();
  const usedListings = new Set();
  const usedAskers = new Set();
  let made = 0;

  for (let n = 0; n < want * 4 && made < want; n += 1) {
    const listing = pick(listings);
    if ((perListing.get(String(listing._id)) || 0) >= 2) continue;

    const fitting = THREADS.filter((t) => t.fits(listing));
    if (!fitting.length) continue;

    /* The first thread an agent gets is one nobody has answered, because an
     * inbox where everything is dealt with has no work in it. A preference, not
     * a requirement: an agent whose only live listing is a plot would otherwise
     * get nothing at all, since none of the unanswered templates fits land. */
    const waiting = fitting.filter((t) => !t.replies.length);
    const template = pick(
      usedListings.size === 0 && waiting.length ? waiting : fitting
    );

    const taken = perListing.get(String(listing._id)) ? usedAskers : new Set();
    const free = askers.filter((a) => !taken.has(String(a._id)) && !usedAskers.has(String(a._id)));
    const asker = free.find(() => rand() > 0.3) || free[0];
    if (!asker) break;

    if (await Enquiry.exists({ listing: listing._id, sender: asker._id })) continue;

    usedListings.add(String(listing._id));
    usedAskers.add(String(asker._id));
    perListing.set(String(listing._id), (perListing.get(String(listing._id)) || 0) + 1);
    made += 1;

    const last = template.replies.at(-1);
    await Enquiry.create({
      listing: listing._id,
      sender: asker._id,
      agent: listing.agent,
      message: template.message,
      phone: asker.phone,
      status: template.status,
      // An agent has read whatever they have already answered. What is waiting
      // on them is what drives the badge in the header.
      readByAgent: template.replies.length > 0,
      readBySender: last?.from !== 'agent',
      replies: template.replies.map((r) => ({
        author: r.from === 'agent' ? listing.agent : asker._id,
        body: r.body,
      })),
    });

    await Listing.updateOne({ _id: listing._id }, { $inc: { enquiryCount: 1 } });
    threads += 1;
    if (!template.replies.length) unanswered += 1;
  }
}

/*
 * Agents and the moderator ask about other people's properties too.
 *
 * Without this the "Sent by me" box is empty on every account except the demo
 * house hunter, so signing in as an agent and looking at the other half of your
 * own inbox shows nothing and reads as broken. An agent moving house, or asking
 * on behalf of a client, is ordinary; what is not ordinary is a property
 * professional who has never once enquired about anything.
 */
const staff = await User.find({ role: { $in: ['agent', 'admin'] } });
let sent = 0;

for (const person of staff) {
  const elsewhere = published.filter((l) => String(l.agent) !== String(person._id));
  const want = 2 + Math.floor(rand() * 3);
  const used = new Set();

  for (let n = 0; n < want * 4 && used.size < want; n += 1) {
    const listing = pick(elsewhere);
    if (used.has(String(listing._id))) continue;

    const fitting = THREADS.filter((t) => t.fits(listing));
    if (!fitting.length) continue;
    const template = pick(fitting);

    // Someone may already be asking about this one, and the thread is keyed on
    // the pair, so only a repeat from the same person would collide.
    if (await Enquiry.exists({ listing: listing._id, sender: person._id })) continue;
    used.add(String(listing._id));

    const last = template.replies.at(-1);
    await Enquiry.create({
      listing: listing._id,
      sender: person._id,
      agent: listing.agent,
      message: template.message,
      phone: person.phone,
      status: template.status,
      readByAgent: template.replies.length > 0,
      readBySender: last?.from !== 'agent',
      replies: template.replies.map((r) => ({
        author: r.from === 'agent' ? listing.agent : person._id,
        body: r.body,
      })),
    });
    await Listing.updateOne({ _id: listing._id }, { $inc: { enquiryCount: 1 } });
    sent += 1;
  }
}

console.log(`${threads} enquiry threads, ${unanswered} waiting on an agent`);
console.log(`${sent} sent by agents and the moderator, so both sides of the inbox have content`);

const perAgent = await Enquiry.aggregate([
  { $group: { _id: '$agent', n: { $sum: 1 } } },
  { $sort: { n: -1 } },
]);
console.log(
  `every agent has an inbox: ${perAgent.length} agents, ${perAgent.at(-1).n}-${perAgent[0].n} threads each`
);

await mongoose.disconnect();
console.log(`
demo logins
  house hunter  demo@tafutakeja.ke    / demo12345
  agent         wanjiru@tafutakeja.ke / agent12345   (verified, western suburbs)
  agent         samuel@tafutakeja.ke  / agent12345   (unverified, listings in review)
  admin         admin@tafutakeja.ke   / admin12345
  the other house hunters sign in with hunter12345`);
