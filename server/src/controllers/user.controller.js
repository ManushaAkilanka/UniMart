/**
 * User Controller
 *
 * GET    /api/users/me              – Get own full profile (authenticated)
 * PATCH  /api/users/me              – Update own profile (fullName, faculty, campus, avatarUrl)
 * GET    /api/users/:id/profile     – Public seller profile (no email, no studentId)
 * GET    /api/users/:id/listings    – Public active listings for a seller
 */
import mongoose from 'mongoose';
import { User, Listing } from '../models/index.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// ── GET /api/users/me ─────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's own profile.
 */
export const getMyProfile = async (req, res, next) => {
  try {
    // req.user is set by requireAuth; lean copy for clean JSON
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Omit sensitive fields – they are already excluded by schema select:false
    // but double-guard here
    delete user.passwordHash;
    delete user.emailVerificationCode;
    delete user.emailVerificationExpiry;

    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/me ───────────────────────────────────────────────────────
/**
 * Update own profile. Allowed fields: fullName, faculty, campus, avatarUrl.
 * Email and studentId changes are NOT allowed through this endpoint.
 * Never exposes email or studentId in response.
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const ALLOWED_FIELDS = ['fullName', 'faculty', 'campus', 'avatarUrl'];
    const updates = {};

    ALLOWED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    });

    // Validate fullName length if provided
    if (updates.fullName !== undefined) {
      if (updates.fullName.length < 2 || updates.fullName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be between 2 and 100 characters.',
        });
      }
    }

    // Validate avatarUrl if provided (must be a valid URL or null)
    if (updates.avatarUrl !== undefined && updates.avatarUrl !== null && updates.avatarUrl !== '') {
      try {
        new URL(updates.avatarUrl);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Avatar URL must be a valid URL.',
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Strip sensitive fields before returning
    delete user.passwordHash;
    delete user.emailVerificationCode;
    delete user.emailVerificationExpiry;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id/profile ────────────────────────────────────────────────
/**
 * Public seller profile.
 * NEVER exposes email or studentId.
 * Returns: fullName, faculty, campus, avatarUrl, isVerified, role, createdAt.
 */
export const getSellerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    // Explicitly select ONLY public-safe fields — never email, studentId, passwordHash
    const user = await User.findById(id)
      .select('fullName faculty campus avatarUrl isVerified role createdAt')
      .lean();

    if (!user || user.isSuspended) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    res.status(200).json({ success: true, data: { seller: user } });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id/listings ───────────────────────────────────────────────
/**
 * Public listing of a seller's active items.
 * Only returns listings with status === 'active'.
 */
export const getSellerListings = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    // Verify seller exists and is not suspended
    const seller = await User.findById(id).select('_id isSuspended').lean();
    if (!seller || seller.isSuspended) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    const [listings, total] = await Promise.all([
      Listing.find({ sellerId: new mongoose.Types.ObjectId(id), status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug icon')
        .lean(),
      Listing.countDocuments({ sellerId: new mongoose.Types.ObjectId(id), status: 'active' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/:id/block ─────────────────────────────────────────────────
export const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    if (id.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: new mongoose.Types.ObjectId(id) },
    });

    res.status(200).json({
      success: true,
      message: `${targetUser.fullName} has been blocked.`,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/:id/unblock ───────────────────────────────────────────────
export const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: new mongoose.Types.ObjectId(id) },
    });

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/blocked ────────────────────────────────────────────────────
export const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'fullName avatarUrl campus faculty isVerified')
      .lean();

    res.status(200).json({
      success: true,
      blockedUsers: user?.blockedUsers || [],
    });
  } catch (err) {
    next(err);
  }
};

