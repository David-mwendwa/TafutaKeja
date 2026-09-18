import { StatusCodes } from 'http-status-codes';
import User from '../models/userModel.js';
import Listing from '../models/listingModel.js';
import SavedListing from '../models/savedListingModel.js';
import Enquiry from '../models/enquiryModel.js';
import { NotFoundError, BadRequestError } from '../errors/customErrors.js';
import { verificationSteps, stepsRemaining } from '../utils/verification.js';

// Role, verified and active are deliberately absent: they are the server's to
// set. `verified` in particular is a claim about the real world, and an agent
// awarding themselves the badge is the whole reason it is worth having.
const PROFILE_FIELDS = ['name', 'phone', 'whatsapp', 'agencyName', 'bio'];

/**
 * The two numbers the header badges carry: saved properties, and conversations
 * waiting on a reply.
 *
 * Its own endpoint rather than a pair of list calls, because the header renders
 * on every route — asking for two paginated collections and throwing away
 * everything but their totals would put a listing payload behind every page
 * view. Both counts hit an index and return a number.
 *
 * Which mailbox is "unread" follows the caller's role, the same rule the inbox
 * itself uses: an agent is waiting on enquiries about their properties, anyone
 * else on replies to the ones they sent.
 */
export const getMyCounts = async (req, res) => {
  // This has to name the same mailbox `/enquiries` opens on, or the badge
  // advertises unread messages the page then does not show.
  const waitingOnAgent = req.user.role === 'agent';

  const [saved, unread] = await Promise.all([
    SavedListing.countDocuments({ user: req.user._id }),
    Enquiry.countDocuments(
      waitingOnAgent
        ? { agent: req.user._id, readByAgent: false }
        : { sender: req.user._id, readBySender: false }
    ),
  ]);

  res.status(StatusCodes.OK).json({ success: true, saved, unread });
};

export const updateMe = async (req, res) => {
  if (req.body.password)
    throw new BadRequestError('Use the change-password form to update your password');

  const updates = {};
  for (const field of PROFILE_FIELDS)
    if (req.body[field] !== undefined) updates[field] = req.body[field];

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(StatusCodes.OK).json({ success: true, user });
};

export const updateAvatar = async (req, res) => {
  if (!req.file) throw new BadRequestError('Please choose an image');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl: `/uploads/${req.file.filename}` },
    { new: true }
  );
  res.status(StatusCodes.OK).json({ success: true, user });
};

// Deactivation rather than deletion: enquiry threads reference this account on
// both sides, and removing the row would leave conversations half-anonymous.
export const deactivateMe = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });
  await Listing.updateMany(
    { agent: req.user._id, status: { $in: ['published', 'pending'] } },
    { status: 'archived' }
  );
  res.status(StatusCodes.OK).json({ success: true, message: 'Account deactivated' });
};

// The public agent page. Only ever exposes what an agent would put on a
// business card, plus their live listings.
export const getAgentProfile = async (req, res) => {
  const agent = await User.findOne({
    _id: req.params.id,
    role: { $in: ['agent', 'admin'] },
  }).select('name avatarUrl agencyName bio verified phone whatsapp createdAt');

  if (!agent) throw new NotFoundError('That agent could not be found');

  const listings = await Listing.find({ agent: agent._id, status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(24);

  res.status(StatusCodes.OK).json({ success: true, agent, listings });
};

/**
 * Where an agent stands on getting the verified badge.
 *
 * The rule lives in `utils/verification.js` and is served from here rather than
 * written into the dashboard, so the checklist an agent ticks off is literally
 * the one the request endpoint tests them against.
 */
export const getMyVerification = async (req, res) => {
  const publishedCount = await Listing.countDocuments({
    agent: req.user._id,
    status: 'published',
  });

  const steps = verificationSteps(req.user, publishedCount);
  res.status(StatusCodes.OK).json({
    success: true,
    verification: {
      verified: req.user.verified,
      requestedAt: req.user.verificationRequestedAt || null,
      eligible: stepsRemaining(steps).length === 0,
      steps,
    },
  });
};

export const requestVerification = async (req, res) => {
  if (req.user.role !== 'agent')
    throw new BadRequestError('Only an agent account is verified');
  if (req.user.verified)
    throw new BadRequestError('Your account is already verified');

  const publishedCount = await Listing.countDocuments({
    agent: req.user._id,
    status: 'published',
  });
  const missing = stepsRemaining(verificationSteps(req.user, publishedCount));

  // Naming what is outstanding rather than refusing flatly: "not eligible" sends
  // an agent hunting through their profile for whichever box is unticked.
  if (missing.length)
    throw new BadRequestError(
      `Before we can check your account: ${missing.map((s) => s.label.toLowerCase()).join('; ')}`
    );

  // Asking twice is not an error — it just does not move the queue.
  if (!req.user.verificationRequestedAt) {
    req.user.verificationRequestedAt = new Date();
    await req.user.save({ validateBeforeSave: false });
  }

  res.status(StatusCodes.OK).json({
    success: true,
    requestedAt: req.user.verificationRequestedAt,
    message: 'Your account is with the team for checking',
  });
};
