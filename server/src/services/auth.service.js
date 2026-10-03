/**
 * Auth Service — core business logic for authentication.
 * Controllers delegate here; this layer owns all DB interactions and rules.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ENV } from '../config/env.js';
import { sendVerificationEmail } from './email.service.js';

// ── Allowed university email domains ────────────────────────────────────────
const UNIVERSITY_EMAIL_REGEX = /^[^\s@]+@([a-zA-Z0-9-]+\.)*ac\.lk$/i;

/**
 * Generate a cryptographically random 6-digit OTP.
 */
function generateOTP() {
  // Use crypto to get a uniform random number in [0, 999999]
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 1_000_000;
  return String(num).padStart(6, '0');
}

/**
 * Sign a JWT for a given user ID.
 */
export function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
}

// ── Register ─────────────────────────────────────────────────────────────────

/**
 * Register a new student.
 * - Enforces .ac.lk email domain
 * - Hashes password with bcrypt (cost 12)
 * - Generates + hashes a 6-digit verification OTP
 * - Sends verification email
 *
 * @returns {{ user: object, token: string }}
 */
export async function registerUser({ fullName, email, password, faculty, campus }) {
  // 1. Domain validation
  if (!UNIVERSITY_EMAIL_REGEX.test(email)) {
    const err = new Error('Only verified university email addresses (@*.ac.lk) are accepted.');
    err.statusCode = 422;
    throw err;
  }

  // 2. Check for duplicate
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Generate OTP
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiryMs = ENV.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000;

  // 5. Create user (not yet verified)
  const user = await User.create({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    faculty: faculty?.trim() || null,
    campus: campus?.trim() || null,
    emailVerificationCode: otpHash,
    emailVerificationExpiry: new Date(Date.now() + expiryMs),
  });

  // 6. Send verification email (non-blocking on failure in dev)
  try {
    await sendVerificationEmail(user.email, otp);
  } catch (emailErr) {
    console.error('[Auth] Failed to send verification email:', emailErr.message);
    // Do not reject registration if email fails — user can request resend later
  }

  // 7. Issue JWT so the client can immediately call /verify-email
  const token = signToken(user._id);

  return { user: user.toJSON(), token };
}

// ── Verify Email ──────────────────────────────────────────────────────────────

/**
 * Verify a user's email using the 6-digit OTP.
 */
export async function verifyEmail({ email, code }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+emailVerificationCode +emailVerificationExpiry'
  );

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (user.isVerified) {
    const err = new Error('Email is already verified.');
    err.statusCode = 400;
    throw err;
  }

  if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
    const err = new Error('No verification code found. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  if (Date.now() > user.emailVerificationExpiry.getTime()) {
    const err = new Error('Verification code has expired. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  const isValid = await bcrypt.compare(code, user.emailVerificationCode);
  if (!isValid) {
    const err = new Error('Invalid verification code.');
    err.statusCode = 400;
    throw err;
  }

  // Mark verified and clear OTP fields
  user.isVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();

  const token = signToken(user._id);
  return { user: user.toJSON(), token };
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user by email + password.
 * - Suspended users are blocked
 * - Returns user (without passwordHash) + signed JWT
 *
 * @returns {{ user: object, token: string }}
 */
export async function loginUser({ email, password }) {
  // 1. Find user including passwordHash (excluded by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // 2. Check suspension before any further processing
  if (user.isSuspended) {
    const err = new Error(
      `Your account has been suspended. ${user.suspendedReason ? 'Reason: ' + user.suspendedReason : 'Please contact support.'}`
    );
    err.statusCode = 403;
    throw err;
  }

  // 3. Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = signToken(user._id);

  // Build safe response (exclude passwordHash)
  const userObj = user.toJSON();

  return { user: userObj, token };
}

// ── Get current user ──────────────────────────────────────────────────────────

/**
 * Fetch a safe user object by ID (no passwordHash).
 */
export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user.toJSON();
}

// ── Google OAuth Handler ──────────────────────────────────────────────────────

/**
 * Handle Google Workspace user sign-in / registration:
 * - Enforces .ac.lk email domain requirement
 * - If user exists, links googleId (if not linked) and ensures isVerified=true
 * - If user is new, creates verified student account skipping OTP
 * - Blocks suspended users
 * - Returns user JSON and signed JWT token
 *
 * @param {{ googleId: string, email: string, fullName?: string, avatarUrl?: string }} params
 * @returns {{ user: object, token: string }}
 */
export async function handleGoogleUser({ googleId, email, fullName, avatarUrl }) {
  if (!email) {
    const err = new Error('No email address provided by Google account.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Enforce .ac.lk university email domain rule
  if (!UNIVERSITY_EMAIL_REGEX.test(normalizedEmail)) {
    const err = new Error(
      'Only verified university email addresses (@*.ac.lk) are accepted. Please use your institutional Google account.'
    );
    err.statusCode = 422;
    throw err;
  }

  // 2. Check for existing user by googleId or email
  let user = await User.findOne({
    $or: [{ googleId }, { email: normalizedEmail }],
  });

  if (user) {
    // 3. Block suspended users
    if (user.isSuspended) {
      const err = new Error(
        `Your account has been suspended. ${
          user.suspendedReason ? 'Reason: ' + user.suspendedReason : 'Please contact support.'
        }`
      );
      err.statusCode = 403;
      throw err;
    }

    // Link googleId if not yet linked
    if (!user.googleId && googleId) {
      user.googleId = googleId;
    }

    // Since Google verified the email, ensure account is verified (skips OTP)
    if (!user.isVerified) {
      user.isVerified = true;
      user.emailVerificationCode = undefined;
      user.emailVerificationExpiry = undefined;
    }

    // Populate avatarUrl from Google if user has none
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
    }

    await user.save();
  } else {
    // 4. New user: determine campus from institutional email domain
    let campus = null;
    if (normalizedEmail.includes('cmb.ac.lk')) campus = 'University of Colombo';
    else if (normalizedEmail.includes('mrt.ac.lk')) campus = 'University of Moratuwa';
    else if (normalizedEmail.includes('pdn.ac.lk')) campus = 'University of Peradeniya';
    else if (normalizedEmail.includes('sjp.ac.lk')) campus = 'University of Sri Jayewardenepura';
    else if (normalizedEmail.includes('kln.ac.lk')) campus = 'University of Kelaniya';
    else if (normalizedEmail.includes('ruh.ac.lk')) campus = 'University of Ruhuna';
    else if (normalizedEmail.includes('jfn.ac.lk')) campus = 'University of Jaffna';

    user = await User.create({
      fullName: fullName?.trim() || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      googleId: googleId || null,
      isVerified: true, // Google already verified email, skip 6-digit OTP step!
      avatarUrl: avatarUrl || null,
      campus,
    });
  }

  const token = signToken(user._id);
  return { user: user.toJSON(), token };
}
