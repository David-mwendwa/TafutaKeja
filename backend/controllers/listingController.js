import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import Listing from '../models/listingModel.js';
import SavedListing from '../models/savedListingModel.js';
import { escapeRegex, buildPagination, paginationMeta } from '../utils/queryFeatures.js';
import { toSqm } from '../utils/units.js';
import {
  PURPOSES,
  PROPERTY_TYPES,
  AMENITIES,
  FURNISHING,
  RENT_PERIODS,
  COUNTIES,
  LISTING_TRANSITIONS,
  TRANSITION_ROLES,
  MODERATION_REASONS,
  LISTING_STALE_DAYS,
  CURRENCY,
} from '../constants/index.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/customErrors.js';

/**
 * The one place that decides which listings a caller may see.
 *
 * Composed by every read path rather than re-derived at each call site: a
 * draft leaking into one grid because that particular handler forgot the
 * status check is exactly the bug this shape exists to prevent.
 */
const visibilityFilter = (user) => {
  if (user?.role === 'admin') return {};
  if (user?.role === 'agent')
    return { $or: [{ status: 'published' }, { agent: user._id }] };
  return { status: 'published' };
};

const SORTS = {
  newest: { publishedAt: -1, createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  bedrooms: { bedrooms: -1 },
  size: { sizeSqm: -1 },
  popular: { views: -1 },
};

/* Turns the browse page's query string into a Mongo filter. Written out rather
 * than run through the generic builder because most of these are ranges or
 * set-membership with their own rules, and an over-general translator is how a
 * query-string key ends up reaching the database as an operator. */
const buildListingFilter = (query) => {
  const filter = {};

  if (PURPOSES.includes(query.purpose)) filter.purpose = query.purpose;

  const types = String(query.propertyType || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => PROPERTY_TYPES.includes(t));
  if (types.length) filter.propertyType = { $in: types };

  if (query.county) filter['location.county'] = String(query.county).trim();
  if (query.area)
    filter['location.area'] = new RegExp(`^${escapeRegex(String(query.area).trim())}$`, 'i');

  const min = Number(query.minPrice);
  const max = Number(query.maxPrice);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.price = {};
    if (Number.isFinite(min)) filter.price.$gte = min;
    if (Number.isFinite(max)) filter.price.$lte = max;
  }

  // "3 bedrooms" on a property search universally means three or more.
  const beds = Number(query.bedrooms);
  if (Number.isFinite(beds) && beds > 0) filter.bedrooms = { $gte: beds };
  const baths = Number(query.bathrooms);
  if (Number.isFinite(baths) && baths > 0) filter.bathrooms = { $gte: baths };

  if (FURNISHING.includes(query.furnishing)) filter.furnishing = query.furnishing;

  const amenities = String(query.amenities || '')
    .split(',')
    .map((a) => a.trim())
    .filter((a) => AMENITIES.includes(a));
  // $all, not $in: ticking "Lift" and "Gym" means both, not either.
  if (amenities.length) filter.amenities = { $all: amenities };

  const term = typeof query.search === 'string' ? query.search.trim() : '';
  if (term) {
    const pattern = new RegExp(escapeRegex(term), 'i');
    filter.$or = [
      { title: pattern },
      { 'location.area': pattern },
      { 'location.county': pattern },
    ];
  }

  return filter;
};

export const getListings = async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query, {
    defaultLimit: 12,
    maxLimit: 48,
  });

  const filter = { ...visibilityFilter(req.user), ...buildListingFilter(req.query) };

  /*
   * "Properties near here" uses $geoWithin, not $nearSphere.
   *
   * $nearSphere sorts by distance, and an operator that sorts is rejected
   * inside an aggregation pipeline — which is exactly what countDocuments runs.
   * The find would succeed and the count beside it would throw, so the endpoint
   * failed only when a radius was supplied. $geoWithin does no sorting, works
   * identically in both, and the caller's chosen sort still applies.
   */
  const near = String(req.query.near || '').split(',').map(Number);
  if (near.length === 2 && near.every(Number.isFinite)) {
    const radiusKm = Math.min(Number(req.query.radiusKm) || 10, 100);
    // $centerSphere takes its radius in radians: kilometres over the Earth's
    // equatorial radius.
    filter['location.geo'] = {
      $geoWithin: { $centerSphere: [[near[0], near[1]], radiusKm / 6378.1] },
    };
  }

  const listingQuery = Listing.find(filter)
    .populate('agent', 'name avatarUrl agencyName verified')
    .sort(SORTS[req.query.sort] || SORTS.newest)
    .skip(skip)
    .limit(limit);

  const [listings, total] = await Promise.all([
    listingQuery,
    Listing.countDocuments(filter),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    listings,
    meta: paginationMeta({ page, limit, total }),
  });
};

export const getFeatured = async (req, res) => {
  // The landing page opens on three of these and grids the rest, so it asks for
  // more than the six a carousel wanted. Capped, because this is a public
  // endpoint and `limit` is whatever the caller types.
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 12);

  const listings = await Listing.find({ status: 'published', featured: true })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('agent', 'name avatarUrl agencyName verified');
  res.status(StatusCodes.OK).json({ success: true, listings });
};

const findVisible = async (idOrSlug, user) => {
  const byId = mongoose.isValidObjectId(idOrSlug);
  const listing = await Listing.findOne({
    ...visibilityFilter(user),
    ...(byId ? { _id: idOrSlug } : { slug: idOrSlug }),
  }).populate('agent', 'name avatarUrl agencyName verified phone whatsapp bio createdAt');

  if (!listing) throw new NotFoundError('That property could not be found');
  return listing;
};

export const getListing = async (req, res) => {
  const listing = await findVisible(req.params.idOrSlug, req.user);

  // Fire-and-forget so a view counter can never slow down or fail the page.
  // Not counted when the owner or a moderator is looking at their own listing.
  const isOwnView =
    req.user && (req.user._id.equals(listing.agent._id) || req.user.role === 'admin');
  if (!isOwnView) Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } }).catch(() => {});

  let saved = false;
  if (req.user) {
    saved = Boolean(
      await SavedListing.exists({ user: req.user._id, listing: listing._id })
    );
  }

  res.status(StatusCodes.OK).json({ success: true, listing, saved });
};

export const getSimilar = async (req, res) => {
  const listing = await findVisible(req.params.idOrSlug, req.user);
  const spread = 0.35;

  const similar = await Listing.find({
    _id: { $ne: listing._id },
    status: 'published',
    purpose: listing.purpose,
    'location.area': listing.location.area,
    price: { $gte: listing.price * (1 - spread), $lte: listing.price * (1 + spread) },
  })
    .limit(4)
    .populate('agent', 'name agencyName verified');

  // Widen to the county rather than show an empty rail — in a thin area the
  // nearest comparable property is more useful than nothing.
  if (similar.length < 4) {
    const extra = await Listing.find({
      _id: { $ne: listing._id, $nin: similar.map((s) => s._id) },
      status: 'published',
      purpose: listing.purpose,
      'location.county': listing.location.county,
    })
      .limit(4 - similar.length)
      .populate('agent', 'name agencyName verified');
    similar.push(...extra);
  }

  res.status(StatusCodes.OK).json({ success: true, listings: similar });
};

/* The filter vocabulary, served rather than duplicated in the frontend. A chip
 * the UI offers that the API does not honour is a filter that silently does
 * nothing, and that is invisible in review. */
/**
 * What the market actually holds right now, for the landing page.
 *
 * Separate from `getMeta`, which is a constant dump and touches no database.
 * This one only ever counts **published** listings, so the numbers on the
 * landing page are the numbers a visitor can actually click through to — a
 * count that includes drafts and rejected listings is a promise the browse page
 * cannot keep.
 *
 * The areas come from the catalogue rather than a hand-written list. A fixed
 * list of "popular" estates goes stale the moment inventory moves, and sends
 * readers to an empty results page; this can only ever name an area that has
 * something in it.
 */
export const getStats = async (req, res) => {
  const [totals, areas] = await Promise.all([
    Listing.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
    ]),
    /*
     * Per estate: how much there is, how much it is looked at, and what it
     * costs. The landing page listed estates by stock, which on this catalogue
     * is eight rows of "3", a number carrying no information, under a heading
     * that claimed to say where people were looking. Views are what that
     * heading actually promises, and the cheapest asking price is what a reader
     * came to find out. Rent and sale are kept apart: one "from" figure across
     * a 45K flat and a 9M house describes neither.
     */
    Listing.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: { area: '$location.area', county: '$location.county' },
          count: { $sum: 1 },
          views: { $sum: '$views' },
          rentFrom: {
            $min: { $cond: [{ $eq: ['$purpose', 'rent'] }, '$price', null] },
          },
          saleFrom: {
            $min: { $cond: [{ $eq: ['$purpose', 'sale'] }, '$price', null] },
          },
        },
      },
      { $sort: { views: -1, count: -1, '_id.area': 1 } },
    ]),
  ]);

  const byPurpose = Object.fromEntries(totals.map((t) => [t._id, t.count]));

  res.status(StatusCodes.OK).json({
    success: true,
    stats: {
      total: totals.reduce((n, t) => n + t.count, 0),
      rent: byPurpose.rent || 0,
      sale: byPurpose.sale || 0,
      counties: new Set(areas.map((a) => a._id.county)).size,
      areas: areas.map((a) => ({
        area: a._id.area,
        county: a._id.county,
        count: a.count,
        views: a.views,
        rentFrom: a.rentFrom ?? null,
        saleFrom: a.saleFrom ?? null,
      })),
    },
  });
};

export const getMeta = (req, res) =>
  res.status(StatusCodes.OK).json({
    success: true,
    meta: {
      purposes: PURPOSES,
      propertyTypes: PROPERTY_TYPES,
      amenities: AMENITIES,
      furnishing: FURNISHING,
      rentPeriods: RENT_PERIODS,
      counties: COUNTIES,
      sorts: Object.keys(SORTS),
      moderationReasons: MODERATION_REASONS,
      transitions: LISTING_TRANSITIONS,
      staleDays: LISTING_STALE_DAYS,
      currency: CURRENCY,
    },
  });

/* Fields an agent is allowed to set. Anything outside this list — status,
 * featured, views, agent — is assigned by the server or by a moderator, so
 * picking explicitly is what stops a crafted body promoting its own listing. */
const WRITABLE = [
  'title', 'description', 'purpose', 'propertyType', 'price', 'rentPeriod',
  'serviceCharge', 'depositMonths', 'negotiable', 'bedrooms', 'bathrooms',
  'parkingSpaces', 'furnishing', 'amenities', 'location', 'images', 'availableFrom',
];

const pickWritable = (body) => {
  const data = {};
  for (const key of WRITABLE) if (body[key] !== undefined) data[key] = body[key];
  if (body.size !== undefined) data.sizeSqm = toSqm(body.size, body.sizeUnit);
  return data;
};

export const createListing = async (req, res) => {
  const listing = await Listing.create({
    ...pickWritable(req.body),
    agent: req.user._id,
    status: 'draft',
  });
  res.status(StatusCodes.CREATED).json({ success: true, listing });
};

const assertCanEdit = (listing, user) => {
  const isOwner = listing.agent.equals ? listing.agent.equals(user._id) : false;
  if (!isOwner && user.role !== 'admin')
    throw new UnauthorizedError('This listing belongs to another agent');
};

export const updateListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new NotFoundError('That property could not be found');
  assertCanEdit(listing, req.user);

  Object.assign(listing, pickWritable(req.body));

  // Editing a live listing sends it back for review. A moderator approved the
  // words and photographs that were there at the time, not whatever replaces
  // them — without this, approval is a one-time gate anyone can walk through.
  if (listing.status === 'published' && req.user.role !== 'admin') {
    listing.status = 'pending';
  }

  await listing.save();
  res.status(StatusCodes.OK).json({ success: true, listing });
};

export const transitionListing = async (req, res) => {
  const { status, reason } = req.body;
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new NotFoundError('That property could not be found');
  assertCanEdit(listing, req.user);

  if (!listing.canTransitionTo(status))
    throw new BadRequestError(
      `A ${listing.status} listing cannot become ${status}`
    );

  const allowedRoles = TRANSITION_ROLES[status] || [];
  if (!allowedRoles.includes(req.user.role)) {
    const article = (role) => (/^[aeiou]/i.test(role) ? 'an' : 'a');
    throw new UnauthorizedError(
      `Only ${allowedRoles.map((r) => `${article(r)} ${r}`).join(' or ')} can do that`
    );
  }

  if (status === 'rejected' && !reason)
    throw new BadRequestError('Please say why the listing was rejected');

  listing.status = status;
  if (['published', 'rejected'].includes(status)) {
    listing.moderation = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      reason: reason || undefined,
    };
  }
  await listing.save();

  res.status(StatusCodes.OK).json({ success: true, listing });
};

export const deleteListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new NotFoundError('That property could not be found');
  assertCanEdit(listing, req.user);

  // The conversations about a property outlive the advert, so enquiries are
  // kept; saved rows are not, since a saved list pointing at nothing renders
  // as a row of broken cards.
  await Promise.all([
    listing.deleteOne(),
    SavedListing.deleteMany({ listing: listing._id }),
  ]);

  res.status(StatusCodes.OK).json({ success: true, message: 'Listing deleted' });
};

export const getMyListings = async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query, { defaultLimit: 20 });
  const filter = { agent: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [listings, total, counts] = await Promise.all([
    Listing.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Listing.countDocuments(filter),
    Listing.aggregate([
      { $match: { agent: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    listings,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    meta: paginationMeta({ page, limit, total }),
  });
};
