import { Router } from 'express';
import {
  getListings, getListing, getSimilar, getFeatured, getMeta, getStats,
  createListing, updateListing, deleteListing, transitionListing, getMyListings,
} from '../controllers/listingController.js';
import { createEnquiry } from '../controllers/enquiryController.js';
import { toggleSaved } from '../controllers/savedController.js';
import { protect, restrictTo, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/meta', getMeta);
router.get('/featured', getFeatured);
router.get('/stats', getStats);

// `mine` is declared before `/:idOrSlug`, or the slug route swallows it.
router.get('/mine', protect, restrictTo('agent', 'admin'), getMyListings);

// optionalAuth, not protect: an agent browsing signed in should see their own
// drafts in the grid, but a signed-out reader must still get the page.
router.get('/', optionalAuth, getListings);
router.get('/:idOrSlug', optionalAuth, getListing);
router.get('/:idOrSlug/similar', optionalAuth, getSimilar);

router.post('/:listingId/enquiries', protect, createEnquiry);
router.post('/:listingId/save', protect, toggleSaved);

router.post('/', protect, restrictTo('agent', 'admin'), createListing);
router.patch('/:id', protect, restrictTo('agent', 'admin'), updateListing);
router.patch('/:id/status', protect, restrictTo('agent', 'admin'), transitionListing);
router.delete('/:id', protect, restrictTo('agent', 'admin'), deleteListing);

export default router;
