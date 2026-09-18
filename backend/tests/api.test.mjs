/**
 * Drives the running API over HTTP.
 *
 *   npm run dev   (or npm start)   then   npm test
 *
 * Deliberately black-box: it makes real requests against a real database, so it
 * exercises the Mongo indexes, the cookie handling and the middleware chain —
 * the places the interesting bugs actually live. A unit test of the controller
 * would not have caught the $nearSphere/countDocuments conflict, because that
 * only exists inside MongoDB.
 *
 * Assumes `npm run seed && npm run seed:demo` has been run.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:5008/api/v1';

/** Keeps the session cookie, the way a browser would. */
const makeClient = () => {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
  };
};

/*
 * Sessions are memoised per account.
 *
 * Signing in afresh in every test drove fifteen-odd logins through a limiter
 * that allows twenty in fifteen minutes, so a second run inside one window
 * failed twelve tests with 429s that read like authorisation bugs. Four
 * accounts, four logins.
 */
const sessions = new Map();
const login = async (email, password) => {
  if (sessions.has(email)) return sessions.get(email);
  const client = makeClient();
  const res = await client('POST', '/auth/login', { email, password });
  assert.equal(res.status, 200, `could not sign in as ${email}: ${res.data?.message}`);
  const session = { client, user: res.data.user };
  sessions.set(email, session);
  return session;
};

let anon;
before(async () => {
  anon = makeClient();
  const health = await anon('GET', '/health');
  /* 429 here is the rate limiter, not a dead server — the ceiling is per IP
     across the whole API, and a browser session driving the app burns through
     it quickly. Saying so beats sending the reader off to restart something
     that is already running. */
  assert.notEqual(
    health.status,
    429,
    'the API is rate limiting this IP — wait for the window, or restart it with RATE_LIMIT_MAX set higher'
  );
  assert.equal(health.status, 200, 'the API is not running — start it with npm run dev');
});

// --- public browsing ---------------------------------------------------------

test('the public grid shows only published listings', async () => {
  const { status, data } = await anon('GET', '/listings?limit=48');
  assert.equal(status, 200);
  assert.ok(data.listings.length > 0, 'no listings — run npm run seed');
  const statuses = [...new Set(data.listings.map((l) => l.status))];
  assert.deepEqual(statuses, ['published'], `leaked non-published listings: ${statuses}`);
});

test('filters actually narrow the result set', async () => {
  const all = await anon('GET', '/listings?limit=1');
  const rent = await anon('GET', '/listings?purpose=rent&limit=1');
  const threeBed = await anon('GET', '/listings?purpose=rent&bedrooms=3&limit=1');

  assert.ok(rent.data.meta.total < all.data.meta.total);
  assert.ok(threeBed.data.meta.total <= rent.data.meta.total);

  const { data } = await anon('GET', '/listings?purpose=rent&bedrooms=3&limit=20');
  for (const l of data.listings) {
    assert.equal(l.purpose, 'rent');
    // "3 bedrooms" on a property search means three or more.
    assert.ok(l.bedrooms >= 3, `${l.title} has ${l.bedrooms} bedrooms`);
  }
});

test('a price range is honoured in both directions', async () => {
  const { data } = await anon('GET', '/listings?purpose=rent&minPrice=50000&maxPrice=120000&limit=30');
  assert.ok(data.listings.length > 0);
  for (const l of data.listings) {
    assert.ok(l.price >= 50000 && l.price <= 120000, `${l.title} at ${l.price} is outside the range`);
  }
});

test('ticking two amenities means both, not either', async () => {
  const { data } = await anon('GET', '/listings?amenities=Lift,Gym&limit=20');
  for (const l of data.listings) {
    assert.ok(l.amenities.includes('Lift') && l.amenities.includes('Gym'), l.title);
  }
});

test('a radius search returns a geographically sensible set', async () => {
  // Regression: this used $nearSphere, which MongoDB rejects inside the
  // aggregation that countDocuments runs — the find succeeded and the count
  // beside it threw, so the endpoint 500d only when a radius was supplied.
  const nairobi = await anon('GET', '/listings?near=36.7856,-1.2921&radiusKm=8&limit=40');
  assert.equal(nairobi.status, 200, 'radius search failed');
  assert.ok(nairobi.data.meta.total > 0);

  const mombasa = await anon('GET', '/listings?near=39.70,-4.03&radiusKm=15&limit=40');
  assert.equal(mombasa.status, 200);

  const nairobiAreas = new Set(nairobi.data.listings.map((l) => l.location.area));
  const mombasaAreas = new Set(mombasa.data.listings.map((l) => l.location.area));
  // 450km apart: the two sets must not overlap.
  for (const area of mombasaAreas) assert.ok(!nairobiAreas.has(area), `${area} in both`);
});

test('a listing is reachable by slug and carries its agent', async () => {
  const { data } = await anon('GET', '/listings?limit=1');
  const slug = data.listings[0].slug;
  const res = await anon('GET', `/listings/${slug}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.listing.slug, slug);
  assert.ok(res.data.listing.agent.name);
  assert.equal(res.data.listing.agent.password, undefined, 'agent password leaked');
});

// --- auth --------------------------------------------------------------------

test('a wrong password and an unknown email give the same answer', async () => {
  const wrong = await anon('POST', '/auth/login', { email: 'demo@tafutakeja.ke', password: 'nope' });
  const missing = await anon('POST', '/auth/login', { email: 'nobody@nowhere.ke', password: 'nope' });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  // Different messages would turn this endpoint into an account-enumeration oracle.
  assert.equal(wrong.data.message, missing.data.message);
});

test('registration cannot grant itself admin', async () => {
  const client = makeClient();
  const email = `escalation-${Date.now()}@test.ke`;
  const res = await client('POST', '/auth/register', {
    name: 'Escalation Test', email, password: 'test12345', role: 'admin',
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.user.role, 'user');

  // The only test here that creates a row rather than borrowing one, so it is
  // the only one that can leave litter — and it did: a run a day for a fortnight
  // put twenty-nine of these in front of whoever opened the admin user list.
  // Deactivating is the app's own way out, and the model's `find` hook takes
  // the account out of every query.
  const gone = await client('DELETE', '/users/me');
  assert.equal(gone.status, 200, 'the throwaway account outlived the test');
});

test('an authenticated route refuses an anonymous caller', async () => {
  const res = await anon('GET', '/saved');
  assert.equal(res.status, 401);
});

// --- the listing state machine ----------------------------------------------

test('only an admin may publish, and only along a legal transition', async () => {
  const agent = await login('samuel@tafutakeja.ke', 'agent12345');
  const admin = await login('admin@tafutakeja.ke', 'admin12345');

  /*
   * The fixture is borrowed and put back, not consumed.
   *
   * This test needs a listing of the agent's own sitting in review, and it ends
   * by publishing one — so left alone it spends a pending listing per run,
   * drains the seeded moderation queue, and then fails on "no pending listing",
   * which reads like a broken endpoint rather than an exhausted seed. If none
   * is left, it submits one of the agent's drafts and returns it afterwards.
   */
  const mine = await agent.client('GET', '/listings/mine?status=pending');
  let listing = mine.data.listings[0];
  let restoreTo = 'pending';

  if (!listing) {
    const drafts = await agent.client('GET', '/listings/mine?status=draft');
    listing = drafts.data.listings[0];
    assert.ok(listing, 'no pending or draft listing to test with');
    restoreTo = 'draft';
    const submitted = await agent.client('PATCH', `/listings/${listing._id}/status`, {
      status: 'pending',
    });
    assert.equal(submitted.status, 200, 'an agent could not submit their own draft');
  }

  const selfPublish = await agent.client('PATCH', `/listings/${listing._id}/status`, {
    status: 'published',
  });
  assert.equal(selfPublish.status, 403, 'an agent published their own listing');

  const illegal = await admin.client('PATCH', `/listings/${listing._id}/status`, { status: 'sold' });
  assert.equal(illegal.status, 400, 'pending -> sold should be rejected');

  const noReason = await admin.client('PATCH', `/listings/${listing._id}/status`, {
    status: 'rejected',
  });
  assert.equal(noReason.status, 400, 'a rejection without a reason should be refused');

  const ok = await admin.client('PATCH', `/listings/${listing._id}/status`, { status: 'published' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.listing.status, 'published');
  assert.ok(ok.data.listing.publishedAt, 'publishedAt was not stamped');

  /*
   * `published -> pending` is not a legal status transition, and shouldn't be.
   * The route back is the one the app itself uses: an edit to a published
   * listing returns it for review.
   */
  await agent.client('PATCH', `/listings/${listing._id}`, { price: listing.price });
  if (restoreTo === 'draft')
    await agent.client('PATCH', `/listings/${listing._id}/status`, { status: 'draft' });
});

test('editing a published listing sends it back for review', async () => {
  const agent = await login('wanjiru@tafutakeja.ke', 'agent12345');
  const mine = await agent.client('GET', '/listings/mine?status=published');
  const listing = mine.data.listings[0];
  assert.ok(listing, 'no published listing to test with');

  const res = await agent.client('PATCH', `/listings/${listing._id}`, { price: listing.price + 1000 });
  assert.equal(res.status, 200);
  // A moderator approved the words and photographs that were there at the time,
  // not whatever replaces them.
  assert.equal(res.data.listing.status, 'pending');

  // And restore it, for the same reason as above — this test spends a
  // published listing every time it runs.
  const admin = await login('admin@tafutakeja.ke', 'admin12345');
  await agent.client('PATCH', `/listings/${listing._id}`, { price: listing.price });
  await admin.client('PATCH', `/listings/${listing._id}/status`, { status: 'published' });
});

test('an agent cannot set the fields the server owns', async () => {
  const agent = await login('samuel@tafutakeja.ke', 'agent12345');
  const mine = await agent.client('GET', '/listings/mine?status=draft');
  const listing = mine.data.listings[0];
  assert.ok(listing, 'no draft listing to test with');

  const res = await agent.client('PATCH', `/listings/${listing._id}`, {
    featured: true, status: 'published', views: 99999,
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.listing.featured, false);
  assert.equal(res.data.listing.status, 'draft');
  assert.equal(res.data.listing.views, 0);
});

test('an agent cannot touch another agent\'s listing', async () => {
  const wanjiru = await login('wanjiru@tafutakeja.ke', 'agent12345');
  const samuel = await login('samuel@tafutakeja.ke', 'agent12345');

  const theirs = await samuel.client('GET', '/listings/mine?limit=1');
  const listing = theirs.data.listings[0];

  const res = await wanjiru.client('PATCH', `/listings/${listing._id}`, { price: 1 });
  assert.equal(res.status, 403);
});

test('an agent cannot award themselves the verified badge', async () => {
  const agent = await login('samuel@tafutakeja.ke', 'agent12345');
  const res = await agent.client('PATCH', '/users/me', { verified: true, role: 'admin' });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.verified, false);
  assert.equal(res.data.user.role, 'agent');
});

test('the moderation queue is admin-only', async () => {
  const agent = await login('samuel@tafutakeja.ke', 'agent12345');
  const res = await agent.client('GET', '/admin/queue');
  assert.equal(res.status, 403);
});

// --- enquiries ---------------------------------------------------------------

test('an enquiry thread is private to its two participants', async () => {
  const demo = await login('demo@tafutakeja.ke', 'demo12345');
  const outsider = await login('wanjiru@tafutakeja.ke', 'agent12345');

  const inbox = await demo.client('GET', '/enquiries?box=sent');
  const thread = inbox.data.enquiries.find(
    (e) => String(e.agent?._id) !== String(outsider.user._id)
  );
  assert.ok(thread, 'no thread the outsider is not a party to');

  const read = await outsider.client('GET', `/enquiries/${thread._id}`);
  assert.equal(read.status, 403, 'a third party read someone else\'s conversation');

  const reply = await outsider.client('POST', `/enquiries/${thread._id}/replies`, {
    body: 'Intruding on this conversation',
  });
  assert.equal(reply.status, 403);
});

test('a second message continues the thread rather than opening a new one', async () => {
  const demo = await login('demo@tafutakeja.ke', 'demo12345');

  /*
   * Follows up on a thread that already exists rather than opening a fresh one.
   * There is no way to withdraw an enquiry, so a test that starts a
   * conversation every run leaves one behind every run: thread counts climb,
   * the listing's enquiry count climbs, and the admin's thirty-day figure
   * climbs with them. Appending to a seeded thread proves the same rule and
   * settles after the first run, because the only thing it changes after that
   * is a read flag which is already false.
   */
  const before = await demo.client('GET', '/enquiries?box=sent&limit=50');
  const thread = before.data.enquiries[0];
  assert.ok(thread, 'no seeded thread to follow up on');

  const again = await demo.client('POST', `/listings/${thread.listing._id}/enquiries`, {
    message: 'Following up on my earlier message about this one.',
  });
  assert.equal(again.status, 200, 'a second message opened a new thread instead of continuing one');
  assert.equal(String(again.data.enquiry._id), String(thread._id));
  assert.ok(again.data.enquiry.replies.length > 0, 'the follow-up was not appended to the thread');

  const after = await demo.client('GET', '/enquiries?box=sent&limit=50');
  assert.equal(
    after.data.enquiries.length,
    before.data.enquiries.length,
    'the follow-up created a second thread about the same property'
  );
});

test('an unpublished listing takes no enquiries', async () => {
  const demo = await login('demo@tafutakeja.ke', 'demo12345');
  const agent = await login('samuel@tafutakeja.ke', 'agent12345');
  const drafts = await agent.client('GET', '/listings/mine?status=draft');
  const draft = drafts.data.listings[0];
  assert.ok(draft, 'no draft listing to test with');

  const res = await demo.client('POST', `/listings/${draft._id}/enquiries`, {
    message: 'Can I enquire about this unpublished one?',
  });
  assert.equal(res.status, 404);
});

// --- saved -------------------------------------------------------------------

test('saving is a toggle and survives a double tap', async () => {
  const demo = await login('demo@tafutakeja.ke', 'demo12345');
  const { data } = await anon('GET', '/listings?limit=40');
  const saved = await demo.client('GET', '/saved');
  const savedIds = new Set(saved.data.saved.map((s) => String(s.listing._id)));
  const listing = data.listings.find((l) => !savedIds.has(String(l._id)));
  assert.ok(listing);

  const on = await demo.client('POST', `/listings/${listing._id}/save`);
  assert.equal(on.data.saved, true);

  // The unique index is what makes a racing double-tap harmless.
  const [a, b] = await Promise.all([
    demo.client('POST', `/listings/${listing._id}/save`),
    demo.client('POST', `/listings/${listing._id}/save`),
  ]);
  assert.ok([200].includes(a.status) && [200].includes(b.status));

  const after = await demo.client('GET', '/saved');
  const count = after.data.saved.filter((s) => String(s.listing._id) === String(listing._id)).length;
  assert.ok(count <= 1, `saved the same listing ${count} times`);

  // The double tap leaves the toggle wherever the race landed, so put it back
  // explicitly rather than assuming. Left alone this grew the demo account's
  // saved list by one property per run.
  if (count === 1) await demo.client('POST', `/listings/${listing._id}/save`);
  const restored = await demo.client('GET', '/saved');
  assert.ok(
    !restored.data.saved.some((s) => String(s.listing._id) === String(listing._id)),
    'the test left the listing saved'
  );
});

// --- header counts -----------------------------------------------------------

test('the header counts need a session', async () => {
  const res = await anon('GET', '/users/me/counts');
  assert.equal(res.status, 401);
});

test('the header counts agree with the collections they summarise', async () => {
  const demo = await login('demo@tafutakeja.ke', 'demo12345');

  const [counts, saved, inbox] = await Promise.all([
    demo.client('GET', '/users/me/counts'),
    demo.client('GET', '/saved'),
    demo.client('GET', '/enquiries?limit=100'),
  ]);
  assert.equal(counts.status, 200);

  /*
   * The badge is worth nothing if it disagrees with the page it links to, and
   * the two numbers are computed by different code — one counts documents, the
   * other filters a populated list. This is the assertion that keeps the cheap
   * endpoint honest against the expensive one.
   */
  assert.equal(counts.data.saved, saved.data.saved.length);
  assert.equal(counts.data.unread, inbox.data.unread);
});

test('an agent counts the enquiries waiting on them, not the ones they sent', async () => {
  const agent = await login('wanjiru@tafutakeja.ke', 'agent12345');
  const counts = await agent.client('GET', '/users/me/counts');
  const received = await agent.client('GET', '/enquiries?box=received&limit=100');
  assert.equal(counts.status, 200);
  assert.equal(counts.data.unread, received.data.unread);
});

test('saving a property moves the saved count', async () => {
  const demo = await login('demo@tafutakeja.ke', 'demo12345');
  const { data } = await anon('GET', '/listings?limit=40');
  const saved = await demo.client('GET', '/saved');
  const savedIds = new Set(saved.data.saved.map((s) => String(s.listing._id)));
  const listing = data.listings.find((l) => !savedIds.has(String(l._id)));
  assert.ok(listing);

  const before = await demo.client('GET', '/users/me/counts');
  await demo.client('POST', `/listings/${listing._id}/save`);
  const after = await demo.client('GET', '/users/me/counts');
  assert.equal(after.data.saved, before.data.saved + 1);

  // Put it back, so a second run starts where this one did.
  await demo.client('POST', `/listings/${listing._id}/save`);
  const restored = await demo.client('GET', '/users/me/counts');
  assert.equal(restored.data.saved, before.data.saved);
});

// --- agent verification ------------------------------------------------------

test('the verification checklist is the rule the request is judged against', async () => {
  // A brand new agent: no phone, no bio, nothing published. Deliberately not
  // one of the seeded agents, because what they have on them is a seeding decision
  // and a test that reads it is a test that breaks when the seed improves.
  const client = makeClient();
  const email = `unverified-${Date.now()}@test.ke`;
  const created = await client('POST', '/auth/register', {
    name: 'Checklist Test', email, password: 'test12345', role: 'agent',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.role, 'agent');

  try {
    const { status, data } = await client('GET', '/users/me/verification');
    assert.equal(status, 200);
    assert.equal(data.verification.verified, false);

    const missing = data.verification.steps.filter((s) => !s.done);
    assert.equal(data.verification.eligible, missing.length === 0);
    assert.equal(missing.length, data.verification.steps.length, 'a new agent has done none of it');

    // The refusal has to name what is outstanding, or an agent is left hunting
    // for whichever box the server disagreed about.
    const refused = await client('POST', '/users/me/verification');
    assert.equal(refused.status, 400);
    for (const step of missing) {
      assert.ok(
        refused.data.message.includes(step.label.toLowerCase()),
        `refusal did not mention "${step.label}"`
      );
    }
  } finally {
    await client('DELETE', '/users/me');
  }
});

test('an agent who has done the list may ask, and asking is all it does', async () => {
  const agent = await login('samuel@tafutakeja.ke', 'agent12345');
  const admin = await login('admin@tafutakeja.ke', 'admin12345');

  const { data } = await agent.client('GET', '/users/me/verification');
  assert.equal(data.verification.eligible, true, 'the seeded unverified agent should be able to ask');

  const asked = await agent.client('POST', '/users/me/verification');
  assert.equal(asked.status, 200);
  assert.ok(asked.data.requestedAt);

  // Asking does not award anything: that is still a person's decision.
  const after = await agent.client('GET', '/users/me/verification');
  assert.equal(after.data.verification.verified, false);

  const found = await admin.client('GET', '/admin/users?search=samuel');
  assert.ok(found.data.users[0].verificationRequestedAt, 'the request never reached a moderator');

  // Put it back: declining closes the request and leaves the badge off, which
  // is exactly where the seed has him.
  await admin.client('PATCH', `/admin/users/${found.data.users[0]._id}/verified`, { verified: false });
  const restored = await admin.client('GET', '/admin/users?search=samuel');
  assert.equal(restored.data.users[0].verified, false);
  assert.ok(!restored.data.users[0].verificationRequestedAt);
});

test('an agent cannot skip the queue by asking twice', async () => {
  const admin = await login('admin@tafutakeja.ke', 'admin12345');
  const agent = await login('wanjiru@tafutakeja.ke', 'agent12345');

  const found = await admin.client('GET', '/admin/users?search=wanjiru');
  const id = found.data.users[0]._id;

  // She is seeded verified, so the badge comes off for the duration and the
  // admin's own decision at the end is what puts it back — the restore path is
  // the app's, not a direct write.
  await admin.client('PATCH', `/admin/users/${id}/verified`, { verified: false });
  try {
    const first = await agent.client('POST', '/users/me/verification');
    assert.equal(first.status, 200);

    const again = await agent.client('POST', '/users/me/verification');
    assert.equal(again.status, 200);
    assert.equal(again.data.requestedAt, first.data.requestedAt, 'asking again moved the queue');

    const listed = await admin.client('GET', '/admin/users?search=wanjiru');
    assert.ok(listed.data.users[0].verificationRequestedAt, 'the request is invisible to moderators');
  } finally {
    await admin.client('PATCH', `/admin/users/${id}/verified`, { verified: true });
  }

  const restored = await admin.client('GET', '/admin/users?search=wanjiru');
  assert.equal(restored.data.users[0].verified, true);
  assert.ok(
    !restored.data.users[0].verificationRequestedAt,
    'a decision has to close the request, or it stays in the outstanding list'
  );
});

test('only an agent is verified', async () => {
  const admin = await login('admin@tafutakeja.ke', 'admin12345');
  const demo = await login('demo@tafutakeja.ke', 'demo12345');

  assert.equal((await admin.client('POST', '/users/me/verification')).status, 400);
  assert.equal((await demo.client('POST', '/users/me/verification')).status, 400);
});

test('the user list counts only the people it can list', async () => {
  const admin = await login('admin@tafutakeja.ke', 'admin12345');
  const { data } = await admin.client('GET', '/admin/users?limit=100');

  // `countDocuments` does not run the model's `find` hook, so a deactivated
  // account used to be counted and not shown — pagination then promises a page
  // that renders empty.
  assert.equal(
    data.meta.total,
    data.users.length,
    'the pagination total disagrees with the rows behind it'
  );

  const overview = await admin.client('GET', '/admin/overview');
  const byRole = Object.values(overview.data.overview.usersByRole).reduce((a, b) => a + b, 0);
  assert.equal(byRole, data.meta.total, 'the overview counts a different set of people');
});

test('the verified badge is an agent claim, so only an agent can be given it', async () => {
  const admin = await login('admin@tafutakeja.ke', 'admin12345');
  const list = await admin.client('GET', '/admin/users?limit=100');

  for (const role of ['admin', 'user']) {
    const target = list.data.users.find((u) => u.role === role);
    assert.ok(target, `no ${role} in the seed`);
    const res = await admin.client('PATCH', `/admin/users/${target._id}/verified`, { verified: true });
    assert.equal(res.status, 400, `a ${role} was given the verified badge`);
  }
});
