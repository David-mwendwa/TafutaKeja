# TafutaKeja

**Tafuta keja** is "look for a house" in Swahili and Sheng, which is what most people opening a
property site in Nairobi are actually doing.

A property marketplace for Kenya, built with the MERN stack: search by estate
rather than by county, compare rent against service charge and deposit, shortlist
places with private notes, and message the agent in a thread both sides can read
afterwards. Agents draft, publish and manage their own listings; every listing
passes a moderation queue before it goes live.

Not deployed yet. The data lives on MongoDB Atlas; the frontend is built for
Netlify and the API for Render, and **Deployment** below is the runbook.

---

## About the data

There is no open feed of Kenyan property listings, so **the listings here are
composed, not real**. Nothing on the site is a place you could go and rent. This
is different from the other projects in this workspace — Talentifyx ingests real
adverts from Arbeitnow, furniworld's catalogue is real retailer stock — and it is
stated plainly rather than glossed over.

What *is* real is the part that makes the product worth building:

- **37 neighbourhoods** with their actual coordinates — Kilimani, Buruburu,
  Syokimau, Nyali, Elgon View, Kamakwa and the rest, across 10 counties
- **The price bands each one trades in.** A bedsitter in Juja at KES 7,500 and a
  five-bedroom in Karen at KES 77M are priced the way that market prices them.
  Sale prices derive from rent at roughly 185× the monthly figure, which is a
  6–7% gross yield — the honest conversion, and it keeps rent and sale listings
  in the same area telling a consistent story
- **Land priced per acre by belt**, because land does not track rent closely
  enough to be inferred from it: Karen rents a fraction of what Kilimani does per
  bedroom while its land costs far more
- **The photography** (harvested from Unsplash) and the amenities Kenyan listings
  genuinely advertise — borehole water, a backup generator, a DSQ

The catalogue is generated deterministically from a fixed seed, so it is the same
every run. See `backend/data/areas.js` and `backend/data/listings.js`.

---

## Running it

```bash
npm run install:all          # root, backend and frontend

cp backend/.env.example backend/.env    # then set JWT_SECRET
docker compose -f ../infra/docker-compose.yml up -d mongo

npm run ingest               # harvest listing photographs from Unsplash (once)
npm run images:optimize      # resize them into responsive WebP (once)
npm run seed                 # agents + 72 listings
npm run seed:demo            # demo accounts, house hunters, saved properties,
                             # and the enquiry threads on both sides of every inbox

npm run dev                  # API on :5008, web on :5013
```

The frontend port is pinned to **5013** and the backend's CORS allowlist expects
exactly that. Change one without the other and every request fails as a CORS
error that reads like an application bug. Port 5000 is unavailable on macOS —
AirPlay Receiver holds it — which is why the API sits at 5008.

### Demo logins

| Role | Email | Password | What it shows |
|---|---|---|---|
| House hunter | `demo@tafutakeja.ke` | `demo12345` | saved properties, message threads |
| Agent (verified) | `wanjiru@tafutakeja.ke` | `agent12345` | live listings across the western suburbs |
| Agent (unverified) | `samuel@tafutakeja.ke` | `agent12345` | listings still awaiting review |
| Admin | `admin@tafutakeja.ke` | `admin12345` | moderation queue, user management |

The fourteen other house hunters seeded alongside them sign in with
`hunter12345`, and are who the enquiries in each agent's inbox come from.

The sign-in page has fill buttons for all four.

### Tests

```bash
npm test                              # 24 API tests — needs the server running
npm test --prefix frontend            # 5 prerender/hydration tests — needs a build
```

The API tests are deliberately black-box, driving a real server against a real
database. A unit test of the controller would not have caught the
`$nearSphere`/`countDocuments` conflict, because that only exists inside MongoDB.

---

## How it is put together

```
backend/           Express + Mongoose, ESM
  constants/       the domain vocabulary, served to the frontend at /listings/meta
  data/            areas.js (real places + price bands), listings.js (the generator)
  models/          User, Listing, Enquiry, SavedListing
  scripts/         seedListings.js, seedDemo.js, copyDatabase.js (cluster to cluster)
  utils/           imagePipeline.js is the one description of a listing photograph
frontend/          React 19 + Vite + Tailwind v3
  lib/seo.js       -> data/site.js: canonicalUrl() and titleForPage(), used by
                   both the app and the build script
  scripts/         prerender.jsx, verify-build.mjs
```

### Things worth knowing

**Photographs are the product, so they get the most attention.** The harvest
pulls 138 Unsplash originals; `npm run images:optimize` rewrites each into WebP
at 400/800/1600 plus a resized JPEG fallback at its original filename. A browse
page of twelve properties costs **204KB** rather than several megabytes. The
database stores one path per photograph and `lib/images.js` derives the WebP
names from it, so the catalogue is never one failed migration away from having no
pictures.

**One definition of the canonical, imported by both halves.** Netlify serves a
prerendered route from a directory and 301s the un-slashed form, so `/about/` is
the URL that answers 200. An in-app `<Link>` fires no redirect, so an app that
builds `site.url + location.pathname` quietly rewrites a correct canonical into
one that redirects — and a direct hit hides it completely. `verify-build.mjs`
compares every page's canonical against the path Netlify actually serves that
file at, and checks the sitemap in both directions.

**The SPA fallback is `app.html`, not `index.html`.** Netlify answers any
unknown path with the fallback; pointing it at index.html would serve the home
page's markup *and its canonical* for every listing URL, telling a crawler that
every property page is a duplicate of the home page. `app.html` is an empty shell
with no canonical. Prerendered files additionally carry a `data-prerendered`
stamp, and the app adopts markup only when it matches the current path —
otherwise React discards the document with error #418 on every fallback route.

**Listing pages are the SEO payload.** Each carries `RealEstateListing`
structured data with an Offer in KES. A property that has been let or sold keeps
its page — the link is already out there, and a dead URL is worse than an honest
one — but drops its structured data, asks for `noindex`, and tells the reader.
The same predicate drives both, so they cannot disagree. Note what `netlify.toml`
does *not* do: there is no `X-Robots-Tag` over `/listing/*`, because that would
stop a crawler ever reading the per-listing noindex.

**Moderation actually means something.** Editing a published listing sends it
back for review: a moderator approved the words and photographs that were there
at the time, not whatever replaces them. The state machine lives in
`constants/index.js` and is served to the frontend, so the agent dashboard renders
exactly the buttons that will work rather than re-deriving the rules and drifting.

**One visibility gate.** `visibilityFilter()` is composed by every read path.
Block-and-status checks written ad hoc at each call site are a privacy bug
waiting to happen — a draft leaks into one grid because that handler forgot.

---

### Do not run the suite against the deployed database

`npm test` drives a real database: it signs in as the seeded accounts, registers
throwaway agents, and borrows a pending listing to walk the state machine. It
puts back everything it can, but an account cannot be deleted through the app,
only deactivated, so each run leaves a hidden row behind. That is harmless in
development and is litter in production.

Point `DATABASE_URL` at the workspace Docker Mongo before running it. The line
is kept commented in `.env` next to the Atlas one for exactly this.

## Deployment

Frontend → Netlify (`netlify.toml`, base `frontend`), API → Render
(`render.yaml`, free plan), data → MongoDB Atlas. Three pieces, and the two
deployed ones are on different domains, which is what most of the configuration
below is about.

**Render (the API).** `render.yaml` describes the service. Two values are marked
`sync: false` and must be set in the dashboard, because they do not belong in the
repo:

| variable | value |
|---|---|
| `DATABASE_URL` | the Atlas connection string, including `/tafutakeja` before the `?` |
| `JWT_SECRET` | a long random string; changing it signs everyone out |

`FRONTEND_URL` and `PROD_FRONTEND_URL` are already in `render.yaml` and feed the
CORS allowlist. If the Netlify site ends up on a different hostname, change them
there or every request from the browser fails as a CORS error that reads like an
application bug.

**Netlify (the frontend).** Set `VITE_API_URL` under Site configuration →
Environment variables to the Render URL plus `/api/v1`. Without it the build
falls back to the localhost default in `src/api/apiClient.js` and the deployed
site talks to a machine that is not there.

**Atlas.** `scripts/copyDatabase.js` moves a whole database between clusters:

```
node scripts/copyDatabase.js "<source-uri>" "<target-uri>" [--wipe]
```

It copies documents at the driver level rather than through the models, because
Mongoose would re-run `pre('save')` on the way in and re-hash the password hashes
as though they were plaintext. Indexes are copied too: the 2dsphere on a
listing's geo and the unique pair on an enquiry are both load bearing, and the
documents do not carry them.

Atlas also needs the deployed API's address in Network Access. Render's free plan
does not offer a static outbound IP, so that means allowing `0.0.0.0/0` and
relying on the database credentials, which is the usual trade on this tier.

### What does not survive a deploy

The API writes uploaded photographs to `backend/public/uploads` on its own disk.
Render's free plan has an **ephemeral filesystem**: it is wiped on every deploy
and whenever the instance restarts after idling. The seeded catalogue is fine,
because those images are committed under `backend/public/images` and ship with
the code, but a photograph an agent uploads through the dashboard will disappear
without warning. Moving uploads to Cloudinary is the fix, the way JamiiChat does
it; until then this is a known limitation of the demo rather than a bug.

The free Render plan also sleeps, so the first request after a quiet spell takes
~20 seconds. The app renders from a cached profile and revalidates underneath,
and says "waking the server up" after four seconds rather than showing a spinner
that is indistinguishable from a broken site.

## Licence

MIT. Photographs are from Unsplash under the Unsplash licence.
