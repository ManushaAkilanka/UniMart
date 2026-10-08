import { Router } from 'express';
import * as listingController from '../controllers/listing.controller.js';
import { requireAuth, optionalAuth, requireApproved } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.js';
import { handleListingImageUpload } from '../middleware/upload.middleware.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import {
  getListingsQuerySchema,
  createListingSchema,
  getListingByIdSchema,
  updateListingSchema,
  updateListingStatusSchema,
} from '../middleware/listing.schema.js';

const router = Router();

// GET /api/listings/mine (must be defined BEFORE /:id)
router.get('/mine', requireAuth, listingController.getMyListings);

// GET /api/listings (Public search with filters, pagination, and facets)
router.get('/', validateRequest(getListingsQuerySchema), listingController.getListings);

// POST /api/listings (Create listing with image upload)
router.post(
  '/',
  requireAuth,
  requireApproved,
  uploadRateLimiter,
  handleListingImageUpload,
  validateRequest(createListingSchema),
  listingController.createListing
);

// GET /api/listings/:id (View single listing and safely increment viewCount)
router.get(
  '/:id',
  optionalAuth,
  validateRequest(getListingByIdSchema),
  listingController.getListingById
);

// PATCH /api/listings/:id/status (Mark sold / active / hidden)
router.patch(
  '/:id/status',
  requireAuth,
  validateRequest(updateListingStatusSchema),
  listingController.updateListingStatus
);

// POST /api/listings/:id/claim (Claim a free listing)
router.post('/:id/claim', requireAuth, requireApproved, listingController.claimListing);

// POST /api/listings/:id/release-claim (Owner releases an existing claim)
router.post('/:id/release-claim', requireAuth, listingController.releaseClaim);

// PATCH /api/listings/:id (Update listing details)
router.patch(
  '/:id',
  requireAuth,
  uploadRateLimiter,
  handleListingImageUpload,
  validateRequest(updateListingSchema),
  listingController.updateListing
);

// DELETE /api/listings/:id (Delete listing and clean up images)
router.delete(
  '/:id',
  requireAuth,
  validateRequest(getListingByIdSchema),
  listingController.deleteListing
);

export default router;
