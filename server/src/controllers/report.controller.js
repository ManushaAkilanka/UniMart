/**
 * Report Controller
 *
 * POST /api/reports – Submit a safety/moderation report for listing, user, message, or conversation
 */
import { Report } from '../models/index.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const VALID_REASONS = [
  'spam',
  'inappropriate_content',
  'misleading_information',
  'prohibited_item',
  'fraud',
  'harassment',
  'other',
];
const VALID_TARGET_TYPES = ['listing', 'user', 'message', 'conversation'];

export const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `targetType must be one of: ${VALID_TARGET_TYPES.join(', ')}.`,
      });
    }

    if (!targetId || !OBJECT_ID_REGEX.test(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid targetId is required.',
      });
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `reason must be one of: ${VALID_REASONS.join(', ')}.`,
      });
    }

    if (details && details.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Report details cannot exceed 1000 characters.',
      });
    }

    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason,
      details: details ? details.trim() : null,
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our campus safety team will review it.',
      report,
    });
  } catch (err) {
    next(err);
  }
};
