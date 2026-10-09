/**
 * Recommendation Engine Service
 *
 * Approach:
 * Content-based recommendation algorithm utilizing internal database signals
 * without any external APIs, third-party libraries, or paid ML services.
 *
 * Signals used:
 * 1. User Favorites (Strong interest signal):
 *    Extracts categoryId and listingType from user's saved items in the Favorite model.
 * 2. User Inquiries / Conversations (High intent signal):
 *    Extracts categoryId and listingType from listings the user initiated a conversation about.
 * 3. Campus Affiliation (Contextual proximity signal):
 *    Gives bonus relevance to active listings matching the user's university campus.
 *
 * Exclusions:
 * - User's own listings (sellerId === userId) are excluded.
 * - Items the user already favorited are excluded.
 * - Hidden, sold, or non-active listings are excluded (only status: 'active').
 *
 * Ranking & Scoring:
 * - Each candidate item receives a weighted score:
 *   + 5 points per category match from user's interest profile
 *   + 2 points per listingType match from user's interest profile
 *   + 1.5 points if on the user's campus
 *   + Normalized recency score (up to 2 points)
 *   + Normalized popularity score based on viewCount (up to 1 point)
 *
 * Cold-Start / Unauthenticated Fallback:
 * - For new users with zero history or guests, returns popular and newest active listings
 *   ordered by viewCount and recency.
 *
 * Item-to-Item Similar Listings (for ListingDetail page):
 * - Finds active items in the same category or with matching listingType/campus,
 *   excluding the target listing itself.
 */

import mongoose from 'mongoose';
import { Listing, Favorite, Conversation, User } from '../models/index.js';

/**
 * Returns personalized recommendations for a user.
 * @param {string|null} userId - The current user ID (optional)
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Promise<Array>} Array of recommended listing documents
 */
export async function getPersonalizedRecommendations(userId = null, limit = 8) {
  const excludeIds = new Set();
  const categoryFreq = new Map();
  const typeFreq = new Map();
  let userCampus = null;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch user details for campus signal
    const userDoc = await User.findById(userObjectId).select('campus').lean();
    if (userDoc?.campus) userCampus = userDoc.campus;

    // 1. Collect user's favorites
    const favorites = await Favorite.find({ userId: userObjectId })
      .populate('listingId', 'categoryId listingType')
      .lean();

    favorites.forEach((fav) => {
      if (fav.listingId) {
        excludeIds.add(fav.listingId._id.toString());
        if (fav.listingId.categoryId) {
          const catStr = fav.listingId.categoryId.toString();
          categoryFreq.set(catStr, (categoryFreq.get(catStr) || 0) + 2); // favorites weighted 2x
        }
        if (fav.listingId.listingType) {
          typeFreq.set(fav.listingId.listingType, (typeFreq.get(fav.listingId.listingType) || 0) + 1);
        }
      }
    });

    // 2. Collect user's inquiries (conversations where user is buyer)
    const conversations = await Conversation.find({ buyerId: userObjectId })
      .populate('listingId', 'categoryId listingType')
      .lean();

    conversations.forEach((conv) => {
      if (conv.listingId) {
        if (conv.listingId.categoryId) {
          const catStr = conv.listingId.categoryId.toString();
          categoryFreq.set(catStr, (categoryFreq.get(catStr) || 0) + 3); // inquiries weighted 3x
        }
        if (conv.listingId.listingType) {
          typeFreq.set(conv.listingId.listingType, (typeFreq.get(conv.listingId.listingType) || 0) + 1);
        }
      }
    });
  }

  // Base filter: active listings, excluding user's own listings and already-favorited items
  const filter = { status: 'active' };
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.sellerId = { $ne: new mongoose.Types.ObjectId(userId) };
  }
  if (excludeIds.size > 0) {
    filter._id = { $nin: Array.from(excludeIds).map((id) => new mongoose.Types.ObjectId(id)) };
  }

  // If user has interest signals, fetch candidates matching categories or types
  const interestedCategoryIds = Array.from(categoryFreq.keys()).map((id) => new mongoose.Types.ObjectId(id));
  const interestedTypes = Array.from(typeFreq.keys());

  let candidates = [];
  if (interestedCategoryIds.length > 0 || interestedTypes.length > 0) {
    const candidateFilter = {
      ...filter,
      $or: [
        ...(interestedCategoryIds.length > 0 ? [{ categoryId: { $in: interestedCategoryIds } }] : []),
        ...(interestedTypes.length > 0 ? [{ listingType: { $in: interestedTypes } }] : []),
      ],
    };

    candidates = await Listing.find(candidateFilter)
      .limit(limit * 4)
      .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl')
      .populate('categoryId', 'name slug icon')
      .lean();
  }

  // If not enough candidates found through signals, supplement with popular active listings
  if (candidates.length < limit) {
    const existingCandidateIds = new Set(candidates.map((c) => c._id.toString()));
    const supplementFilter = { ...filter };
    if (existingCandidateIds.size > 0) {
      const existingArray = Array.from(existingCandidateIds).map((id) => new mongoose.Types.ObjectId(id));
      supplementFilter._id = filter._id
        ? { $nin: [...filter._id.$nin, ...existingArray] }
        : { $nin: existingArray };
    }

    const supplement = await Listing.find(supplementFilter)
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(limit * 2)
      .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl')
      .populate('categoryId', 'name slug icon')
      .lean();

    candidates = [...candidates, ...supplement];
  }

  if (candidates.length === 0) {
    return [];
  }

  // Score candidates
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const scored = candidates.map((item) => {
    let score = 0;

    // Category match score
    const catIdStr = item.categoryId?._id ? item.categoryId._id.toString() : item.categoryId?.toString();
    if (catIdStr && categoryFreq.has(catIdStr)) {
      score += categoryFreq.get(catIdStr) * 5;
    }

    // Listing type match score
    if (item.listingType && typeFreq.has(item.listingType)) {
      score += typeFreq.get(item.listingType) * 2;
    }

    // Campus proximity bonus
    if (userCampus && item.campus && item.campus.toLowerCase() === userCampus.toLowerCase()) {
      score += 3;
    }

    // Recency bonus: items newer than 7 days get bonus
    const ageDays = (now - new Date(item.createdAt).getTime()) / ONE_DAY_MS;
    if (ageDays < 7) {
      score += Math.max(0, 2 - ageDays * 0.2);
    }

    // Popularity signal
    const views = item.viewCount || 0;
    score += Math.min(2, Math.log10(views + 1));

    return { item, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Returns similar active listings for a given listing.
 * @param {string} listingId - The listing to find similar items for
 * @param {number} limit - Maximum number of similar items to return
 * @returns {Promise<Array>} Array of similar listing documents
 */
export async function getSimilarListings(listingId, limit = 4) {
  if (!mongoose.Types.ObjectId.isValid(listingId)) return [];

  const target = await Listing.findById(listingId).select('categoryId listingType campus price').lean();
  if (!target) return [];

  const filter = {
    _id: { $ne: new mongoose.Types.ObjectId(listingId) },
    status: 'active',
    categoryId: target.categoryId,
  };

  let similar = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl')
    .populate('categoryId', 'name slug icon')
    .lean();

  // If not enough items in exact category, widen search to same campus or listingType
  if (similar.length < limit) {
    const existingIds = new Set([listingId, ...similar.map((s) => s._id.toString())]);
    const fallback = await Listing.find({
      _id: { $nin: Array.from(existingIds).map((id) => new mongoose.Types.ObjectId(id)) },
      status: 'active',
      $or: [{ listingType: target.listingType }, { campus: target.campus }],
    })
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(limit - similar.length)
      .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl')
      .populate('categoryId', 'name slug icon')
      .lean();

    similar = [...similar, ...fallback];
  }

  return similar;
}
