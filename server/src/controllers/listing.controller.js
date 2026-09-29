import mongoose from 'mongoose';
import { Listing, Category } from '../models/index.js';
import { deleteFromCloudinary } from '../services/cloudinary.service.js';
import { ENV } from '../config/env.js';

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
      price: listingType === 'free' ? 0 : price,
      priceMode,
      currency,
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
      .populate('categoryId', 'name slug icon');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Check visibility rule: only active listings are public
    const viewerId = req.user?._id?.toString();
    const isOwner = viewerId && viewerId === listing.sellerId?._id?.toString();
    const isAdmin = req.user?.role === 'admin';

    if (listing.status !== 'active' && !isOwner && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Listing is no longer active or available.',
      });
    }

    // Rule: Increment viewCount safely (only if viewer is not the seller)
    if (!isOwner) {
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
