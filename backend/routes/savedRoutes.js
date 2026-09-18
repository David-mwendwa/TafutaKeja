import { Router } from 'express';
import { getSaved, updateNote } from '../controllers/savedController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', getSaved);
router.patch('/:listingId/note', updateNote);

export default router;
