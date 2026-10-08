import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.js';
import { registerSchema, loginSchema, verifyEmailSchema } from '../middleware/auth.schema.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  verifyRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register (rate-limited)
router.post('/register', registerRateLimiter, validateRequest(registerSchema), authController.register);

// POST /api/auth/login (rate-limited)
router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me (protected)
router.get('/me', requireAuth, authController.getMe);

// POST /api/auth/verify-email (rate-limited)
router.post('/verify-email', verifyRateLimiter, validateRequest(verifyEmailSchema), authController.verifyEmail);

// ── Google OAuth 2.0 ──────────────────────────────────────────────────────────
// GET /api/auth/google (redirects to Google login)
router.get('/google', authController.initiateGoogleAuth);

// GET /api/auth/google/callback (Google redirects here with auth code)
router.get('/google/callback', authController.handleGoogleCallback);

// POST /api/auth/google (direct Google sign-in / programmatic endpoint)
router.post('/google', authController.googleAuthJson);

export default router;
