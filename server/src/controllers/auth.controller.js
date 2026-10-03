import crypto from 'crypto';
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

// ── Google OAuth 2.0 ──────────────────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 authorization code flow.
 */
export const initiateGoogleAuth = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: ENV.GOOGLE_CLIENT_ID,
    redirect_uri: ENV.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth redirect, exchanges code, processes user, sets JWT cookie,
 * and redirects to client dashboard (or login page with error param on failure).
 */
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, error: googleError, error_description } = req.query;

    if (googleError) {
      const msg = error_description || 'Google sign-in was cancelled.';
      return res.redirect(`${ENV.CLIENT_URL}/login?error=${encodeURIComponent(msg)}`);
    }

    if (!code) {
      return res.redirect(
        `${ENV.CLIENT_URL}/login?error=${encodeURIComponent('Authorization code missing from Google callback.')}`
      );
    }

    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: ENV.GOOGLE_CLIENT_ID,
        client_secret: ENV.GOOGLE_CLIENT_SECRET,
        redirect_uri: ENV.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      const msg = tokenData.error_description || tokenData.error || 'Failed to authenticate with Google.';
      return res.redirect(`${ENV.CLIENT_URL}/login?error=${encodeURIComponent(msg)}`);
    }

    // 2. Fetch user profile from Google userinfo API
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      return res.redirect(
        `${ENV.CLIENT_URL}/login?error=${encodeURIComponent('Failed to retrieve user profile from Google.')}`
      );
    }

    // 3. Process student account (create or link, enforce .ac.lk domain, mark verified)
    const { user, token } = await authService.handleGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      fullName: profile.name,
      avatarUrl: profile.picture,
    });

    // Clear state cookie
    res.clearCookie('oauth_state');

    // 4. Issue HTTP-only JWT cookie session
    res.cookie('token', token, COOKIE_OPTIONS);

    // 5. Land on /dashboard like normal login
    return res.redirect(`${ENV.CLIENT_URL}/dashboard`);
  } catch (err) {
    const errorMsg = err.message || 'Google authentication failed.';
    return res.redirect(`${ENV.CLIENT_URL}/login?error=${encodeURIComponent(errorMsg)}`);
  }
};

/**
 * POST /api/auth/google
 * Programmatic Google authentication endpoint (used for testing or client-side Google sign-in).
 */
export const googleAuthJson = async (req, res, next) => {
  try {
    const { googleId, email, fullName, avatarUrl } = req.body;
    const { user, token } = await authService.handleGoogleUser({
      googleId,
      email,
      fullName,
      avatarUrl,
    });

    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Google sign-in successful.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
