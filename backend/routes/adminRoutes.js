import { Router } from 'express';
import {
  getModerationQueue, getUsers, setAgentVerified,
  setUserRole, setListingFeatured, getOverview,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('admin'));
router.get('/overview', getOverview);
router.get('/queue', getModerationQueue);
router.get('/users', getUsers);
router.patch('/users/:id/verified', setAgentVerified);
router.patch('/users/:id/role', setUserRole);
router.patch('/listings/:id/featured', setListingFeatured);

export default router;
