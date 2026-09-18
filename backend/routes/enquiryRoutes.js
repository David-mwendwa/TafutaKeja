import { Router } from 'express';
import {
  getInbox, getEnquiry, replyToEnquiry, closeEnquiry,
} from '../controllers/enquiryController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', getInbox);
router.get('/:id', getEnquiry);
router.post('/:id/replies', replyToEnquiry);
router.patch('/:id/close', closeEnquiry);

export default router;
