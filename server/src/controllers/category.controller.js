import { Category } from '../models/index.js';

/**
 * GET /api/categories
 * Public endpoint returning all active marketplace categories.
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};
