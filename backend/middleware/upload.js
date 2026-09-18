import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { BadRequestError } from '../errors/customErrors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The extension comes from the verified MIME type, never from the uploaded
// filename — a client could otherwise name a file "photo.jpg.php" and have it
// written to disk verbatim under a name the web server might execute.
const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, '..', 'public', 'uploads')),
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}.${EXTENSION_BY_MIME[file.mimetype]}`),
});

const fileFilter = (req, file, cb) => {
  if (!EXTENSION_BY_MIME[file.mimetype]) {
    cb(new BadRequestError('Only JPEG, PNG or WEBP images are accepted'));
    return;
  }
  cb(null, true);
};

// Twelve is the model's per-listing ceiling; accepting more here would only
// write files the listing then refuses to reference.
export const uploadListingImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
}).array('images', 12);

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
}).single('avatar');
