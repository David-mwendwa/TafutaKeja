import { processImage } from '../utils/imagePipeline.js';

/**
 * Put every uploaded photograph through the same pipeline as the seeded ones.
 *
 * Without this, `npm run images:optimize` is a one-off cleanup that the next
 * upload starts undoing: an agent photographing a house on a modern phone
 * uploads 4000px originals, and the browse grid goes back to fetching megabytes
 * to draw a thumbnail.
 */
const normalizeUploads = async (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return next();

  for (const file of files) {
    const { width, height } = await processImage(file.path);
    file.dimensions = { width, height };
  }
  next();
};

export default normalizeUploads;
