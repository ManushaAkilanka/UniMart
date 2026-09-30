/**
 * Favorites Controller
 *
 * GET    /api/favorites          – List all favorites for the authenticated user
 * POST   /api/favorites          – Add a listing to favorites
 * DELETE /api/favorites/:listingId – Remove a listing from favorites
 * GET    /api/favorites/ids      – Return only the set of favorited listing IDs (for UI hydration)
 */
import mongoose from 'mongoose';
import { Favorite, Listing } from '../models/index.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// ── GET /api/favorites ─────────────────────────────────────────────────────────
/**
 * Returns paginated favorites for the authenticated user,
 * with the full listing document populated (excluding non-active ones).
 */
export const getFavorites = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'listingId',
          populate: [
            { path: 'sellerId', select: 'fullName faculty campus isVerified avatarUrl' },
            { path: 'categoryId', select: 'name slug icon' },
          ],
        })
        .lean(),
      Favorite.countDocuments({ userId: req.user._id }),
    ]);

    // Filter out favorites whose listing was deleted or is no longer active
    const activeFavorites = favorites.filter(
      (f) => f.listingId && f.listingId.status === 'active'
    );

    res.status(200).json({
      success: true,
      data: {
        favorites: activeFavorites.map((f) => ({
          favoriteId: f._id,
          savedAt: f.createdAt,
          listing: f.listingId,
        })),
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

// ── GET /api/favorites/ids ─────────────────────────────────────────────────────
/**
 * Returns a lightweight set of listing IDs the user has favorited.
 * Used for UI hydration (heart icon state) without loading full listing data.
 */
export const getFavoriteIds = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id })
      .select('listingId -_id')
      .lean();

    const ids = favorites.map((f) => f.listingId.toString());

    res.status(200).json({
      success: true,
      data: { ids },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/favorites ────────────────────────────────────────────────────────
/**
 * Toggle-add a listing to the authenticated user's favorites.
 * Returns 201 on add, 200 with `alreadySaved: true` if already favorited.
 * Rule: Cannot favorite your own listing.
 */
export const addFavorite = async (req, res, next) => {
  try {
    const { listingId } = req.body;

    if (!listingId || !OBJECT_ID_REGEX.test(listingId)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID.' });
    }

    // Verify listing exists and is active
    const listing = await Listing.findById(listingId).select('sellerId status').lean();
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found or is no longer active.',
      });
    }

    // Rule: Cannot favorite own listing
    if (listing.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot save your own listing.',
      });
    }

    // Upsert — ignore duplicate key error (already favorited)
    const existing = await Favorite.findOne({
      userId: req.user._id,
      listingId: new mongoose.Types.ObjectId(listingId),
    }).lean();

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadySaved: true,
        message: 'Listing is already in your favorites.',
        data: { favoriteId: existing._id },
      });
    }

    const favorite = await Favorite.create({
      userId: req.user._id,
      listingId: new mongoose.Types.ObjectId(listingId),
    });

    res.status(201).json({
      success: true,
      alreadySaved: false,
      message: 'Listing added to favorites.',
      data: { favoriteId: favorite._id },
    });
  } catch (err) {
    // Handle race-condition duplicate key (unique index)
    if (err.code === 11000) {
      return res.status(200).json({
        success: true,
        alreadySaved: true,
        message: 'Listing is already in your favorites.',
      });
    }
    next(err);
  }
};

// ── DELETE /api/favorites/:listingId ──────────────────────────────────────────
/**
 * Remove a listing from the authenticated user's favorites.
 * Rule: Only the owner of the favorite record can remove it.
 */
export const removeFavorite = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    if (!OBJECT_ID_REGEX.test(listingId)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID.' });
    }

    const result = await Favorite.deleteOne({
      userId: req.user._id,
      listingId: new mongoose.Types.ObjectId(listingId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Listing removed from favorites.',
    });
  } catch (err) {
    next(err);
  }
};
