import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// ── Authenticated own-profile routes ──────────────────────────────────────────

// GET  /api/users/me — get own full profile
router.get('/me', requireAuth, userController.getMyProfile);

// PATCH /api/users/me — update own profile (fullName, faculty, campus, avatarUrl)
router.patch('/me', requireAuth, userController.updateMyProfile);

// GET /api/users/blocked — get list of blocked users
router.get('/blocked', requireAuth, userController.getBlockedUsers);

// POST /api/users/:id/block — block user
router.post('/:id/block', requireAuth, userController.blockUser);

// POST /api/users/:id/unblock — unblock user
router.post('/:id/unblock', requireAuth, userController.unblockUser);

// ── Public seller profile routes ──────────────────────────────────────────────
// (must be defined AFTER /me and /blocked to avoid route collision)

// GET /api/users/:id/profile — public seller profile (no email, no studentId)
router.get('/:id/profile', userController.getSellerProfile);

// GET /api/users/:id/listings — public active listings for a seller
router.get('/:id/listings', userController.getSellerListings);

export default router;
