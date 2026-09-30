import { Router } from 'express';
import * as favoriteController from '../controllers/favorite.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All favorites routes require authentication
router.use(requireAuth);

// GET /api/favorites/ids — lightweight ID set for UI hydration (must be before /:listingId)
router.get('/ids', favoriteController.getFavoriteIds);

// GET /api/favorites — paginated list with full listing data
router.get('/', favoriteController.getFavorites);

// POST /api/favorites — add a listing to favorites
router.post('/', favoriteController.addFavorite);

// DELETE /api/favorites/:listingId — remove from favorites
router.delete('/:listingId', favoriteController.removeFavorite);

export default router;
