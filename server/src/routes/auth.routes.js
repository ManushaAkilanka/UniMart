import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.js';
import { registerSchema, loginSchema, verifyEmailSchema } from '../middleware/auth.schema.js';
import { ENV } from '../config/env.js';

const router = Router();

// ── Rate limiter for login endpoint ───────────────────────────────────────────
const loginRateLimiter = rateLimit({
  windowMs: ENV.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: ENV.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many login attempts. Please try again after ${ENV.LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
  },
  // Skip rate limiting in test environment
  skip: () => ENV.NODE_ENV === 'test',
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', validateRequest(registerSchema), authController.register);

// POST /api/auth/login  (rate-limited)
router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, authController.getMe);

// POST /api/auth/verify-email
router.post('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);

// ── Google OAuth 2.0 ──────────────────────────────────────────────────────────
// GET /api/auth/google (redirects to Google login)
router.get('/google', authController.initiateGoogleAuth);

// GET /api/auth/google/callback (Google redirects here with auth code)
router.get('/google/callback', authController.handleGoogleCallback);

// POST /api/auth/google (direct Google sign-in / programmatic endpoint)
router.post('/google', authController.googleAuthJson);

export default router;
