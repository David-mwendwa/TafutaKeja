import { StatusCodes } from 'http-status-codes';
import User, { ACTIVE_ONLY } from '../models/userModel.js';
import Listing from '../models/listingModel.js';
import Enquiry from '../models/enquiryModel.js';
import { buildPagination, paginationMeta, escapeRegex } from '../utils/queryFeatures.js';
import { ROLES } from '../constants/index.js';
import { NotFoundError, BadRequestError } from '../errors/customErrors.js';

// The moderation queue. Oldest first, deliberately: a review queue sorted
// newest-first starves the listings at the bottom, which are the ones whose
// agents have been waiting longest.
export const getModerationQueue = async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query, { defaultLimit: 20 });
  const filter = { status: req.query.status || 'pending' };

  const [listings, total, counts] = await Promise.all([
    Listing.find(filter)
      .sort({ updatedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('agent', 'name email agencyName verified'),
    Listing.countDocuments(filter),
    Listing.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    listings,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    meta: paginationMeta({ page, limit, total }),
  });
};

export const getUsers = async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query, { defaultLimit: 25 });
  const filter = { ...ACTIVE_ONLY };
  if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { agencyName: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    users,
    meta: paginationMeta({ page, limit, total }),
  });
};

export const setAgentVerified = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('That user could not be found');
  // Not `role !== 'user'`: that let an admin be given the badge, which is an
  // agent's claim to have been checked out. It shows on an agent page and beside
  // an agent's listings, and a moderator has neither.
  if (user.role !== 'agent')
    throw new BadRequestError('Only an agent account can be verified');

  user.verified = Boolean(req.body.verified);
  // Either answer closes the request. Leaving it set would keep the account in
  // the outstanding list after it had been dealt with.
  user.verificationRequestedAt = undefined;
  await user.save({ validateBeforeSave: false });
  res.status(StatusCodes.OK).json({ success: true, user });
};

export const setUserRole = async (req, res) => {
  const { role } = req.body;
  if (!ROLES.includes(role)) throw new BadRequestError('That is not a valid role');

  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('That user could not be found');

  // An admin demoting themselves locks the last moderator out of the queue.
  if (user._id.equals(req.user._id) && role !== 'admin')
    throw new BadRequestError('You cannot change your own role');

  user.role = role;
  if (role === 'user') {
    user.verified = false;
    user.verificationRequestedAt = undefined;
  }
  await user.save({ validateBeforeSave: false });
  res.status(StatusCodes.OK).json({ success: true, user });
};

export const setListingFeatured = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new NotFoundError('That property could not be found');
  if (listing.status !== 'published')
    throw new BadRequestError('Only a published listing can be featured');

  listing.featured = Boolean(req.body.featured);
  await listing.save();
  res.status(StatusCodes.OK).json({ success: true, listing });
};

export const getOverview = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byStatus, byPurpose, users, enquiries, recent, topAreas] = await Promise.all([
    Listing.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Listing.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$purpose', count: { $sum: 1 }, medianish: { $avg: '$price' } } },
    ]),
    User.aggregate([{ $match: ACTIVE_ONLY }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Enquiry.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Listing.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(5)
      .select('title slug price purpose location publishedAt')
      .populate('agent', 'name agencyName'),
    Listing.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$location.area', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    overview: {
      listingsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      listingsByPurpose: byPurpose,
      usersByRole: Object.fromEntries(users.map((u) => [u._id, u.count])),
      enquiriesLast30Days: enquiries,
      recentListings: recent,
      topAreas,
    },
  });
};
