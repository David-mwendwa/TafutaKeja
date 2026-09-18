import { StatusCodes } from 'http-status-codes';
import { BadRequestError } from '../errors/customErrors.js';

/**
 * Photographs are uploaded before the listing they belong to exists — the
 * agent is still filling in the form — so this returns URLs the form holds
 * onto and submits with the rest of the listing.
 *
 * The files have already been through `normalizeUploads`, so what is on disk
 * is a resized fallback plus its WebP derivatives, not the 4000px original
 * that came off the phone.
 */
export const uploadImages = (req, res) => {
  if (!req.files?.length) throw new BadRequestError('Please choose at least one image');

  const images = req.files.map((file) => ({
    url: `/uploads/${file.filename}`,
    width: file.dimensions?.width,
    height: file.dimensions?.height,
  }));

  res.status(StatusCodes.CREATED).json({ success: true, images });
};
