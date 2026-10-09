import mongoose from 'mongoose';
import { Listing, Category, Conversation, Message, Favorite, User } from '../models/index.js';
import { deleteFromCloudinary } from '../services/cloudinary.service.js';
import { ENV } from '../config/env.js';
import {
  notifyNewMessage,
  notifyListingSold,
  notifyClaim,
} from '../services/notification.service.js';
import {
  getPersonalizedRecommendations,
  getSimilarListings,
} from '../services/recommendation.service.js';

/**
 * Escapes regex special characters to prevent regex injection attacks.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/listings
 * Public browsing endpoint with filters, pagination, whitelisted sorting, and facet counts.
 */
export const getListings = async (req, res, next) => {
  try {
    const {
      search,
      category,
      listingType,
      minPrice,
      maxPrice,
      condition,
      campus,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    // Rule: only active listings are public
    const filter = { status: 'active' };

    // 1. Text Search on Title & Description
    if (search && search.trim()) {
      const sanitizedSearch = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // 2. Category Filter (slug or ObjectId)
    if (category && category.trim()) {
      const catTrimmed = category.trim();
      if (mongoose.Types.ObjectId.isValid(catTrimmed)) {
        filter.categoryId = new mongoose.Types.ObjectId(catTrimmed);
      } else {
        const foundCategory = await Category.findOne({ slug: catTrimmed.toLowerCase() });
        if (foundCategory) {
          filter.categoryId = foundCategory._id;
        } else {
          // If category slug not found, return empty results
          filter.categoryId = new mongoose.Types.ObjectId();
        }
      }
    }

    // 3. Listing Type Filter
    if (listingType) {
      filter.listingType = listingType;
    }

    // 4. Condition Filter
    if (condition) {
      filter.condition = condition;
    }

    // 5. Campus Filter (case-insensitive substring match)
    if (campus && campus.trim()) {
      filter.campus = { $regex: escapeRegex(campus.trim()), $options: 'i' };
    }

    // 6. Price Range Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    // 7. Sort Options
    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price_asc':
        sortOption = { price: 1, createdAt: -1 };
        break;
      case 'price_desc':
        sortOption = { price: -1, createdAt: -1 };
        break;
      case 'popular':
        sortOption = { viewCount: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    // 8. Pagination & Execution
    const skip = (page - 1) * limit;

    const [listings, total, categoryCounts, conditionCounts, allCategories] = await Promise.all([
      Listing.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl createdAt')
        .populate('categoryId', 'name slug icon')
        .lean(),
      Listing.countDocuments(filter),
      // Facet: Category counts among active listings
      Listing.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
      // Facet: Condition counts among active listings
      Listing.aggregate([
        { $match: { status: 'active', condition: { $ne: null } } },
        { $group: { _id: '$condition', count: { $sum: 1 } } },
      ]),
      // All active categories for facet alignment
      Category.find({ isActive: true }).select('name slug icon sortOrder').lean(),
    ]);

    // Build structured category facets
    const countMap = new Map();
    categoryCounts.forEach((item) => {
      countMap.set(item._id.toString(), item.count);
    });

    const categoryFacets = allCategories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((cat) => ({
        categoryId: cat._id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        count: countMap.get(cat._id.toString()) || 0,
      }));

    // Build structured condition facets
    const conditionMap = new Map();
    conditionCounts.forEach((item) => {
      conditionMap.set(item._id, item.count);
    });

    const conditionsOrder = ['new', 'like-new', 'used-good', 'used-fair'];
    const conditionFacets = conditionsOrder.map((cond) => ({
      condition: cond,
      label:
        cond === 'new'
          ? 'Brand New'
          : cond === 'like-new'
          ? 'Like New'
          : cond === 'used-good'
          ? 'Used - Good'
          : 'Used - Fair',
      count: conditionMap.get(cond) || 0,
    }));

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
        facets: {
          categories: categoryFacets,
          conditions: conditionFacets,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/listings
 * Authenticated endpoint for posting a new listing.
 * Enforces: suspended users cannot post.
 */
export const createListing = async (req, res, next) => {
  try {
    // Rule: suspended users cannot post
    if (req.user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. You cannot post listings.',
      });
    }

    const {
      title,
      description,
      categoryId,
      listingType,
      price = 0,
      priceMode = 'fixed',
      currency = 'LKR',
      budgetMin = 0,
      budgetMax = 0,
      urgency = 'flexible',
      condition,
      campus,
      meetupSpots = [],
      images = [],
      status,
    } = req.body;

    const resolvedStatus = status || ENV.DEFAULT_LISTING_STATUS || 'active';

    // Validate category existence
    let resolvedCategoryId = categoryId;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const cat = await Category.findOne({ slug: categoryId });
      if (!cat) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category specified.',
        });
      }
      resolvedCategoryId = cat._id;
    } else {
      const exists = await Category.findById(categoryId);
      if (!exists) {
        return res.status(400).json({
          success: false,
          message: 'Specified category does not exist.',
        });
      }
    }

    const listing = await Listing.create({
      sellerId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      categoryId: resolvedCategoryId,
      listingType,
      price: listingType === 'free' ? 0 : (listingType === 'wanted' && price === 0 && budgetMax > 0 ? budgetMax : price),
      priceMode,
      currency,
      budgetMin,
      budgetMax: budgetMax || (listingType === 'wanted' ? price : 0),
      urgency,
      condition: listingType === 'wanted' ? undefined : condition,
      campus: campus.trim(),
      meetupSpots,
      images,
      status: resolvedStatus,
      viewCount: 0,
    });

    const populated = await Listing.findById(listing._id)
      .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl')
      .populate('categoryId', 'name slug icon');

    res.status(201).json({
      success: true,
      message: 'Listing created successfully.',
      data: { listing: populated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/listings/:id
 * Retrieve a single listing by ID and safely increment viewCount.
 */
export const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl createdAt')
      .populate('categoryId', 'name slug icon')
      .populate('claimedBy', '_id fullName');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Check visibility rule: active listings are public; claimed/other statuses visible to owner, claimer, or admin
    const viewerId = req.user?._id?.toString();
    const isOwner = viewerId && viewerId === listing.sellerId?._id?.toString();
    const isClaimer = viewerId && listing.claimedBy && viewerId === listing.claimedBy._id?.toString();
    const isAdmin = req.user?.role === 'admin';

    if (listing.status !== 'active' && !isOwner && !isClaimer && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Listing is no longer active or available.',
      });
    }

    // Rule: Increment viewCount safely (only if viewer is not the seller or claimer)
    if (!isOwner && !isClaimer) {
      await Listing.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
      listing.viewCount += 1;
    }

    res.status(200).json({
      success: true,
      data: { listing },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/listings/:id
 * Update listing details. Only the owner can edit.
 */
export const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Rule: only the owner can edit
    if (listing.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this listing.',
      });
    }

    // Handle Category update if provided
    if (req.body.categoryId) {
      let resolvedCategoryId = req.body.categoryId;
      if (!mongoose.Types.ObjectId.isValid(req.body.categoryId)) {
        const cat = await Category.findOne({ slug: req.body.categoryId });
        if (!cat) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category specified.',
          });
        }
        resolvedCategoryId = cat._id;
      }
      listing.categoryId = resolvedCategoryId;
    }

    // Update mutable fields
    const allowedFields = [
      'title',
      'description',
      'listingType',
      'price',
      'priceMode',
      'budgetMin',
      'budgetMax',
      'urgency',
      'condition',
      'campus',
      'meetupSpots',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    // Update images if provided or uploaded
    if (req.body.images && Array.isArray(req.body.images)) {
      listing.images = req.body.images;
    }

    await listing.save();

    const updated = await Listing.findById(id)
      .populate('sellerId', 'fullName email faculty campus isVerified avatarUrl')
      .populate('categoryId', 'name slug icon');

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully.',
      data: { listing: updated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/listings/:id
 * Delete listing. Only the owner can delete.
 * Automatically deletes all listing images from Cloudinary.
 */
export const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Rule: only the owner can delete
    if (listing.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this listing.',
      });
    }

    // Delete associated images from Cloudinary
    if (listing.images && listing.images.length > 0) {
      const deletePromises = listing.images
        .filter((img) => img.publicId)
        .map((img) => deleteFromCloudinary(img.publicId));
      await Promise.all(deletePromises);
    }

    await Listing.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/listings/:id/status
 * Update listing status (e.g. mark as 'sold', 'active', 'hidden').
 * Only the owner can update status.
 */
export const updateListingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Rule: only the owner can update status
    if (listing.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this listing.',
      });
    }

    listing.status = status;
    await listing.save();

    // Notify users who favorited this listing when it is marked sold
    if (status === 'sold') {
      const favs = await Favorite.find({ listingId: listing._id })
        .populate('userId', 'email')
        .lean();
      const favoriters = favs.map((f) => ({
        userId: f.userId._id,
        email: f.userId.email,
      }));
      if (favoriters.length > 0) {
        notifyListingSold({
          listingId: listing._id,
          listingTitle: listing.title,
          favoriters,
        }).catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: `Listing marked as ${status}.`,
      data: { listing },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/listings/:id/claim
 * Claim a free listing. Creates/reuses a conversation and sends an auto message.
 * - Must be authenticated and not the owner
 * - Listing must be type 'free' and status 'active'
 */
export const claimListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const claimerId = req.user._id;

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.listingType !== 'free') {
      return res.status(400).json({ success: false, message: 'Only free listings can be claimed.' });
    }
    if (listing.sellerId.toString() === claimerId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot claim your own listing.' });
    }
    if (listing.status === 'claimed') {
      return res.status(409).json({ success: false, message: 'This item has already been claimed.' });
    }
    if (listing.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This listing is no longer available.' });
    }

    // Find or create conversation between claimer and owner for this listing
    let conversation = await Conversation.findOne({
      listingId: listing._id,
      buyerId: claimerId,
      sellerId: listing.sellerId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: claimerId,
        sellerId: listing.sellerId,
        participants: [claimerId, listing.sellerId],
      });
    }

    // Auto-send the claim message from the claimer
    const autoMessage = await Message.create({
      conversationId: conversation._id,
      senderId: claimerId,
      body: "Hi! I'd like to pick this up. When would be a good time to meet?",
    });

    // Update conversation timestamps and lastMessage reference
    conversation.lastMessage = autoMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Mark listing as claimed
    listing.status = 'claimed';
    listing.claimedBy = claimerId;
    await listing.save();

    // Notify the listing owner that their item was claimed
    const claimer = await User.findById(claimerId).select('fullName').lean();
    notifyClaim({
      listingId: listing._id,
      listingTitle: listing.title,
      ownerUserId: listing.sellerId,
      claimerName: claimer?.fullName || 'A student',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Item claimed successfully. A message has been sent to the owner.',
      data: { listing, conversationId: conversation._id },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/listings/:id/release-claim
 * Release an existing claim (owner only). Returns listing to 'active'.
 */
export const releaseClaim = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can release a claim.' });
    }
    if (listing.status !== 'claimed') {
      return res.status(400).json({ success: false, message: 'This listing does not have an active claim.' });
    }

    listing.status = 'active';
    listing.claimedBy = null;
    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Claim released. Listing is active again.',
      data: { listing },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/listings/mine
 * Authenticated endpoint returning all listings created by the current user.
 */
export const getMyListings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find({ sellerId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug icon')
        .lean(),
      Listing.countDocuments({ sellerId: req.user._id }),
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

/**
 * GET /api/listings/recommendations
 * Returns personalized recommendations for authenticated user, or trending items for guest.
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
    const userId = req.user?._id || null;
    const recommendations = await getPersonalizedRecommendations(userId, limit);
    res.status(200).json({
      success: true,
      data: { recommendations },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/listings/:id/similar
 * Returns similar active listings for a given listing.
 */
export const getSimilar = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 12);
    const similar = await getSimilarListings(req.params.id, limit);
    res.status(200).json({
      success: true,
      data: { similar },
    });
  } catch (err) {
    next(err);
  }
};

