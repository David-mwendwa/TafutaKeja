import { StatusCodes } from 'http-status-codes';
import SavedListing from '../models/savedListingModel.js';
import Listing from '../models/listingModel.js';
import { NotFoundError } from '../errors/customErrors.js';

export const toggleSaved = async (req, res) => {
  const listing = await Listing.findById(req.params.listingId).select('_id');
  if (!listing) throw new NotFoundError('That property could not be found');

  const existing = await SavedListing.findOne({
    user: req.user._id,
    listing: listing._id,
  });

  if (existing) {
    await existing.deleteOne();
    return res.status(StatusCodes.OK).json({ success: true, saved: false });
  }

  // The unique index is what makes this safe against a double-tap: two racing
  // requests both miss the findOne, and the second create loses harmlessly.
  try {
    await SavedListing.create({ user: req.user._id, listing: listing._id });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  res.status(StatusCodes.OK).json({ success: true, saved: true });
};

export const getSaved = async (req, res) => {
  const saved = await SavedListing.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'listing',
      populate: { path: 'agent', select: 'name agencyName verified avatarUrl' },
    });

  // A listing deleted since it was saved leaves a null here. Filtered out
  // rather than rendered as a broken card.
  res.status(StatusCodes.OK).json({
    success: true,
    saved: saved.filter((s) => s.listing),
  });
};

export const updateNote = async (req, res) => {
  const row = await SavedListing.findOneAndUpdate(
    { user: req.user._id, listing: req.params.listingId },
    { note: req.body.note },
    { new: true, runValidators: true }
  );
  if (!row) throw new NotFoundError('That property is not in your saved list');
  res.status(StatusCodes.OK).json({ success: true, saved: row });
};
