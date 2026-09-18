import { Router } from 'express';
import { uploadImages } from '../controllers/uploadController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { uploadListingImages } from '../middleware/upload.js';
import normalizeUploads from '../middleware/normalizeUploads.js';

const router = Router();

router.post(
  '/listing-images',
  protect,
  restrictTo('agent', 'admin'),
  uploadListingImages,
  normalizeUploads,
  uploadImages
);

export default router;
