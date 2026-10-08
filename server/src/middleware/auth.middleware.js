/**
 * Authentication & Authorization Middleware
 */
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ENV } from '../config/env.js';

// ── requireAuth ───────────────────────────────────────────────────────────────
/**
 * Verifies the JWT from HTTP-only cookie or Authorization header.
 * Attaches `req.user` (full user document, no passwordHash) on success.
 * Blocks suspended users.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Prefer HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fall back to Authorization header (Bearer <token>)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    // 3. Verify token
    let payload;
    try {
      payload = jwt.verify(token, ENV.JWT_SECRET);
    } catch (jwtErr) {
      const message =
        jwtErr.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({ success: false, message });
    }

    // 4. Fetch user (intentionally excludes passwordHash via schema default)
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    // 5. Block suspended users
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: `Account suspended. ${user.suspendedReason ? 'Reason: ' + user.suspendedReason : 'Contact support.'}`,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ── optionalAuth ─────────────────────────────────────────────────────────────
/**
 * Tries to authenticate user from cookie or Authorization header.
 * Attaches `req.user` if valid, but does not block request if unauthenticated.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (user && !user.isSuspended) {
        req.user = user;
      }
    } catch {
      // Ignore invalid or expired token in optional auth
    }

    next();
  } catch (err) {
    next(err);
  }
};

// ── requireRole ───────────────────────────────────────────────────────────────
/**
 * Factory: returns middleware that restricts access to users with one of
 * the specified roles.
 *
 * Usage:  requireRole('admin')
 *         requireRole('admin', 'moderator')
 *
 * Must be used AFTER requireAuth.
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

// ── requireVerified ───────────────────────────────────────────────────────────
/**
 * Blocks access for users whose email is not yet verified.
 * Must be used AFTER requireAuth.
 */
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address before accessing this resource.',
    });
  }
  next();
};

// ── requireApproved ───────────────────────────────────────────────────────────
/**
 * Blocks users whose accountStatus is 'pending_approval'.
 * Used to restrict listing creation, claiming free items, and seller messaging
 * until an admin approves the non-university Google account.
 * Must be used AFTER requireAuth.
 */
export const requireApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (req.user.accountStatus === 'pending_approval') {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_PENDING_APPROVAL',
      message:
        'Your account is pending admin approval. You cannot perform this action until your account is approved.',
    });
  }
  next();
};
