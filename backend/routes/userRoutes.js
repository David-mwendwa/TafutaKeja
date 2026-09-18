import { Router } from 'express';
import {
  updateMe, updateAvatar, deactivateMe, getAgentProfile, getMyCounts,
  getMyVerification, requestVerification,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import normalizeUploads from '../middleware/normalizeUploads.js';

const router = Router();

router.get('/agents/:id', getAgentProfile);
router.get('/me/counts', protect, getMyCounts);
router.get('/me/verification', protect, getMyVerification);
router.post('/me/verification', protect, requestVerification);
router.patch('/me', protect, updateMe);
router.patch('/me/avatar', protect, uploadAvatar, normalizeUploads, updateAvatar);
router.delete('/me', protect, deactivateMe);

export default router;
