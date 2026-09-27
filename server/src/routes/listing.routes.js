import { Router } from 'express';
import * as listingController from '../controllers/listing.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.js';
import { handleListingImageUpload } from '../middleware/upload.middleware.js';
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

// PATCH /api/listings/:id (Update listing details)
router.patch(
  '/:id',
  requireAuth,
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
