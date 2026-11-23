import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

const isTest = () => ENV.NODE_ENV === 'test';
const shouldSkip = (req) => isTest() && req.headers['x-test-rate-limit'] !== 'true';

/**
 * General Auth Limiter for sensitive auth entry points
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  skip: shouldSkip,
});

/**
 * General API Limiter (100 req/min)
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again after a minute.',
  },
  skip: shouldSkip,
});

/**
 * Auth Rate Limiter for Login
 */
export const loginRateLimiter = rateLimit({
  windowMs: (ENV.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: ENV.LOGIN_RATE_LIMIT_MAX || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many login attempts. Please try again after ${ENV.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15} minutes.`,
  },
  skip: shouldSkip,
});

/**
 * Auth Rate Limiter for Registration
 */
export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again after 15 minutes.',
  },
  skip: shouldSkip,
});

/**
 * Auth Rate Limiter for Email Verification
 */
export const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again after 15 minutes.',
  },
  skip: shouldSkip,
});

/**
 * Auth Rate Limiter for Forgot Password
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 15 minutes.',
  },
  skip: shouldSkip,
});

/**
 * Auth Rate Limiter for Reset Password
 */
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after 15 minutes.',
  },
  skip: shouldSkip,
});

/**
 * Message Rate Limiter (Chat / Meetup proposals)
 */
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many messages sent. Please slow down and wait a moment.',
  },
  skip: isTest,
});

/**
 * Upload Rate Limiter (Listing image uploads)
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 upload requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload requests. Please try again later.',
  },
  skip: isTest,
});
