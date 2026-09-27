/**
 * Auth Controller — thin layer that delegates to auth service.
 * Sets/clears the HTTP-only JWT cookie and formats API responses.
 */
import * as authService from '../services/auth.service.js';
import { ENV } from '../config/env.js';

// ── Cookie config ─────────────────────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: ENV.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, faculty, campus } = req.body;
    const { user, token } = await authService.registerUser({
      fullName,
      email,
      password,
      faculty,
      campus,
    });

    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message:
        'Registration successful. A 6-digit verification code has been sent to your university email.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser({ email, password });

    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    // req.user is already attached by requireAuth middleware
    const user = await authService.getCurrentUser(req.user._id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const { user, token } = await authService.verifyEmail({ email, code });

    // Refresh JWT cookie after verification
    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Welcome to UniMart!',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
