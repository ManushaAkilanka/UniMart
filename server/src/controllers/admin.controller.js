/**
 * Admin / Moderation Controller
 *
 * All routes guarded by requireAuth + requireRole('admin','moderator')
 *
 * GET    /api/admin/stats                          – Dashboard stat cards
 * GET    /api/admin/reports                        – Paginated report queue with filters
 * GET    /api/admin/reports/:id                    – Single report detail
 * PATCH  /api/admin/reports/:id                    – Resolve / dismiss report
 * GET    /api/admin/users                          – Paginated user list (filter by role, suspended, verified)
 * GET    /api/admin/users/:id                      – Single user profile (admin view)
 * PATCH  /api/admin/users/:id/suspend              – Suspend user
 * PATCH  /api/admin/users/:id/unsuspend            – Lift suspension
 * PATCH  /api/admin/users/:id/role                 – Change user role
 * GET    /api/admin/listings                       – Paginated listing list (any status)
 * PATCH  /api/admin/listings/:id/hide              – Hide listing
 * PATCH  /api/admin/listings/:id/approve           – Approve (set active) listing
 * GET    /api/admin/verification-queue             – Unverified users pending review
 * PATCH  /api/admin/verification-queue/:id/approve – Manually verify a user
 * GET    /api/admin/audit-log                      – Paginated audit trail
 */
import mongoose from 'mongoose';
import { User, Listing, Report, AuditLog } from '../models/index.js';
import { notifyReportResolved } from '../services/notification.service.js';

const OID = /^[0-9a-fA-F]{24}$/;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Write a structured audit-log entry after every moderator action.
 */
async function logAction(req, { action, targetType, targetId, meta = {} }) {
  try {
    await AuditLog.create({
      actorId: req.user._id,
      action,
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
      meta,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });
  } catch {
    // Non-fatal – never block the response for audit failures
  }
}

function paginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const [
      openReports,
      reviewedToday,
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      pendingVerification,
      totalListings,
      hiddenListings,
      pendingListings,
    ] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({
        status: { $in: ['resolved', 'dismissed'] },
        reviewedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ isVerified: false, isSuspended: false }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'hidden' }),
      Listing.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      success: true,
      stats: {
        openReports,
        reviewedToday,
        totalUsers,
        verifiedUsers,
        suspendedUsers,
        pendingVerification,
        totalListings,
        hiddenListings,
        pendingListings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/reports ────────────────────────────────────────────────────
export const getReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginationParams(req.query);
    const { status, targetType, reason, search } = req.query;

    const filter = {};
    if (status && ['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      filter.status = status;
    }
    if (targetType && ['listing', 'user', 'message', 'conversation'].includes(targetType)) {
      filter.targetType = targetType;
    }
    if (reason) filter.reason = reason;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'reporterId', select: 'fullName email campus isVerified' })
        .populate({ path: 'reviewedBy', select: 'fullName email role' })
        .lean(),
      Report.countDocuments(filter),
    ]);

    // Populate target entities loosely (best-effort — different types)
    const enriched = await Promise.all(
      reports.map(async (r) => {
        let targetDoc = null;
        try {
          if (r.targetType === 'listing') {
            targetDoc = await Listing.findById(r.targetId)
              .select('title status price campus sellerId')
              .populate({ path: 'sellerId', select: 'fullName email' })
              .lean();
          } else if (r.targetType === 'user') {
            targetDoc = await User.findById(r.targetId)
              .select('fullName email campus role isVerified isSuspended')
              .lean();
          }
        } catch {
          // Target may have been deleted — show null
        }
        return { ...r, targetDoc };
      })
    );

    res.json({
      success: true,
      reports: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/reports/:id ────────────────────────────────────────────────
export const getReportById = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid report ID.' });

    const report = await Report.findById(req.params.id)
      .populate({ path: 'reporterId', select: 'fullName email campus faculty isVerified createdAt' })
      .populate({ path: 'reviewedBy', select: 'fullName email role' })
      .lean();

    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    let targetDoc = null;
    if (report.targetType === 'listing') {
      targetDoc = await Listing.findById(report.targetId)
        .populate({ path: 'sellerId', select: 'fullName email campus isVerified isSuspended' })
        .lean();
    } else if (report.targetType === 'user') {
      targetDoc = await User.findById(report.targetId)
        .select('fullName email campus faculty role isVerified isSuspended suspendedReason createdAt')
        .lean();
    }

    // Related reports on same target (context for severity)
    const relatedReports = await Report.find({
      targetType: report.targetType,
      targetId: report.targetId,
      _id: { $ne: report._id },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reason status createdAt reporterId')
      .populate({ path: 'reporterId', select: 'fullName' })
      .lean();

    res.json({ success: true, report: { ...report, targetDoc, relatedReports } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/reports/:id ──────────────────────────────────────────────
export const updateReport = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid report ID.' });

    const { status, resolution } = req.body;
    const VALID_STATUSES = ['reviewed', 'resolved', 'dismissed'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolution: resolution?.trim() || null,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    )
      .populate({ path: 'reporterId', select: 'fullName email' })
      .populate({ path: 'reviewedBy', select: 'fullName email role' });

    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    await logAction(req, {
      action: `report.${status}`,
      targetType: 'report',
      targetId: report._id,
      meta: { reportTargetType: report.targetType, resolution },
    });

    // Notify the reporter when their report is resolved
    if (status === 'resolved' && report.reporterId) {
      const reporter = await User.findById(report.reporterId._id || report.reporterId)
        .select('email')
        .lean();
      if (reporter) {
        notifyReportResolved({
          reporterUserId: report.reporterId._id || report.reporterId,
          reporterEmail: reporter.email,
          resolution: resolution?.trim() || null,
        }).catch(() => {});
      }
    }

    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginationParams(req.query);
    const { role, suspended, verified, search } = req.query;

    const filter = {};
    if (role && ['student', 'moderator', 'admin'].includes(role)) filter.role = role;
    if (suspended === 'true') filter.isSuspended = true;
    if (suspended === 'false') filter.isSuspended = false;
    if (verified === 'true') filter.isVerified = true;
    if (verified === 'false') filter.isVerified = false;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash -emailVerificationCode -emailVerificationExpiry')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
export const getUserById = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const user = await User.findById(req.params.id)
      .select('-passwordHash -emailVerificationCode -emailVerificationExpiry')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const [listingCount, reportCount, reportedCount] = await Promise.all([
      Listing.countDocuments({ sellerId: user._id }),
      Report.countDocuments({ reporterId: user._id }),
      Report.countDocuments({ targetType: 'user', targetId: user._id }),
    ]);

    res.json({ success: true, user: { ...user, listingCount, reportCount, reportedCount } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/users/:id/suspend ────────────────────────────────────────
export const suspendUser = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const { reason } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot suspend yourself.' });
    }
    // Admins cannot be suspended by moderators
    if (target.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can suspend other admins.' });
    }

    target.isSuspended = true;
    target.suspendedReason = reason?.trim() || 'Violation of campus marketplace policy.';
    await target.save();

    await logAction(req, {
      action: 'user.suspended',
      targetType: 'user',
      targetId: target._id,
      meta: { reason: target.suspendedReason },
    });

    res.json({ success: true, message: `${target.fullName} has been suspended.`, user: target });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/users/:id/unsuspend ─────────────────────────────────────
export const unsuspendUser = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const target = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: false, suspendedReason: null },
      { new: true }
    );
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    await logAction(req, { action: 'user.unsuspended', targetType: 'user', targetId: target._id });

    res.json({ success: true, message: `${target.fullName} suspension has been lifted.`, user: target });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
export const changeUserRole = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can change user roles.' });
    }

    const { role } = req.body;
    if (!['student', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role must be student, moderator, or admin.' });
    }

    const target = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    await logAction(req, { action: 'user.role_changed', targetType: 'user', targetId: target._id, meta: { newRole: role } });

    res.json({ success: true, message: `${target.fullName} is now a ${role}.`, user: target });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/listings ───────────────────────────────────────────────────
export const getListings = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginationParams(req.query);
    const { status, search } = req.query;

    const filter = {};
    if (status && ['pending', 'active', 'sold', 'hidden'].includes(status)) filter.status = status;
    if (search) filter.$text = { $search: search };

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'sellerId', select: 'fullName email campus isVerified isSuspended' })
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({ success: true, listings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/listings/:id/hide ────────────────────────────────────────
export const hideListing = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid listing ID.' });

    const { reason } = req.body;
    const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'hidden' }, { new: true })
      .populate({ path: 'sellerId', select: 'fullName email' });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found.' });

    await logAction(req, {
      action: 'listing.hidden',
      targetType: 'listing',
      targetId: listing._id,
      meta: { reason: reason?.trim() || null, title: listing.title },
    });

    res.json({ success: true, message: `Listing "${listing.title}" has been hidden.`, listing });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/listings/:id/approve ─────────────────────────────────────
export const approveListing = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid listing ID.' });

    const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
      .populate({ path: 'sellerId', select: 'fullName email' });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found.' });

    await logAction(req, { action: 'listing.approved', targetType: 'listing', targetId: listing._id, meta: { title: listing.title } });

    res.json({ success: true, message: `Listing "${listing.title}" approved and set to active.`, listing });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/verification-queue ─────────────────────────────────────────
export const getVerificationQueue = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginationParams(req.query);

    const filter = { isVerified: false, isSuspended: false };
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('fullName email campus faculty studentId createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/verification-queue/:id/approve ───────────────────────────
export const approveVerification = async (req, res, next) => {
  try {
    if (!OID.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await logAction(req, { action: 'user.verified_manually', targetType: 'user', targetId: user._id });

    res.json({ success: true, message: `${user.fullName} has been manually verified.`, user });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/audit-log ──────────────────────────────────────────────────
export const getAuditLog = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginationParams(req.query);
    const { action, actorId, targetType } = req.query;

    const filter = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (actorId && OID.test(actorId)) filter.actorId = actorId;
    if (targetType) filter.targetType = targetType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'actorId', select: 'fullName email role' })
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};
