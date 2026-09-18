import { StatusCodes } from 'http-status-codes';
import Enquiry from '../models/enquiryModel.js';
import Listing from '../models/listingModel.js';
import { buildPagination, paginationMeta } from '../utils/queryFeatures.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/customErrors.js';

export const createEnquiry = async (req, res) => {
  const { message, phone, viewingRequestedFor } = req.body;

  const listing = await Listing.findOne({
    _id: req.params.listingId,
    status: 'published',
  });
  if (!listing)
    throw new NotFoundError('That property is no longer taking enquiries');

  if (listing.agent.equals(req.user._id))
    throw new BadRequestError('This is your own listing');

  // A second message about the same property continues the thread rather than
  // opening a new one — otherwise an agent's inbox fills with three separate
  // "is this still available?" rows from the same person.
  const existing = await Enquiry.findOne({
    listing: listing._id,
    sender: req.user._id,
  });

  if (existing) {
    existing.replies.push({ author: req.user._id, body: message });
    existing.readByAgent = false;
    existing.status = 'new';
    await existing.save();
    return res.status(StatusCodes.OK).json({ success: true, enquiry: existing });
  }

  const enquiry = await Enquiry.create({
    listing: listing._id,
    sender: req.user._id,
    agent: listing.agent,
    message,
    phone: phone || req.user.phone,
    viewingRequestedFor,
    readByAgent: false,
  });

  await Listing.updateOne({ _id: listing._id }, { $inc: { enquiryCount: 1 } });

  res.status(StatusCodes.CREATED).json({ success: true, enquiry });
};

// Either side of the conversation may read it, and nobody else — an enquiry
// carries a phone number and a person's housing intentions.
const assertParticipant = (enquiry, user) => {
  const isSender = enquiry.sender._id
    ? enquiry.sender._id.equals(user._id)
    : enquiry.sender.equals(user._id);
  const isAgent = enquiry.agent._id
    ? enquiry.agent._id.equals(user._id)
    : enquiry.agent.equals(user._id);
  if (!isSender && !isAgent && user.role !== 'admin')
    throw new UnauthorizedError('This conversation is not yours');
  return { isSender, isAgent };
};

export const getInbox = async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query, { defaultLimit: 20 });

  // The same endpoint serves both sides: an agent sees enquiries about their
  // properties, everyone else sees the ones they sent. Only an agent is ever
  // addressed by an enquiry, so everyone else — moderators included — lands on
  // what they sent; opening on an empty agent mailbox gives no hint that the
  // other box is the one they want. Either box stays requestable by name.
  const box = req.query.box || (req.user.role === 'agent' ? 'received' : 'sent');
  const mailbox = box === 'sent' ? 'sender' : 'agent';
  const filter = { [mailbox]: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [enquiries, total, unread] = await Promise.all([
    Enquiry.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('listing', 'title slug images price purpose location status')
      .populate('sender', 'name avatarUrl phone')
      .populate('agent', 'name avatarUrl agencyName'),
    Enquiry.countDocuments(filter),
    Enquiry.countDocuments(
      mailbox === 'agent'
        ? { agent: req.user._id, readByAgent: false }
        : { sender: req.user._id, readBySender: false }
    ),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    enquiries,
    unread,
    meta: paginationMeta({ page, limit, total }),
  });
};

export const getEnquiry = async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id)
    .populate('listing', 'title slug images price purpose location status')
    .populate('sender', 'name avatarUrl phone')
    .populate('agent', 'name avatarUrl agencyName phone whatsapp');
  if (!enquiry) throw new NotFoundError('That conversation could not be found');

  const { isAgent } = assertParticipant(enquiry, req.user);

  // Opening the thread is what marks it read, for whichever side opened it.
  const patch = isAgent ? { readByAgent: true } : { readBySender: true };
  await Enquiry.updateOne({ _id: enquiry._id }, patch);

  res.status(StatusCodes.OK).json({ success: true, enquiry });
};

export const replyToEnquiry = async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) throw new BadRequestError('Please write a reply');

  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw new NotFoundError('That conversation could not be found');
  const { isAgent } = assertParticipant(enquiry, req.user);

  enquiry.replies.push({ author: req.user._id, body });
  // Whoever did not write this reply now has something unread.
  enquiry.readByAgent = isAgent;
  enquiry.readBySender = !isAgent;
  if (isAgent && enquiry.status === 'new') enquiry.status = 'replied';
  await enquiry.save();

  res.status(StatusCodes.OK).json({ success: true, enquiry });
};

export const closeEnquiry = async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw new NotFoundError('That conversation could not be found');
  assertParticipant(enquiry, req.user);

  enquiry.status = enquiry.status === 'closed' ? 'replied' : 'closed';
  await enquiry.save();
  res.status(StatusCodes.OK).json({ success: true, enquiry });
};
