/**
 * Admin / Moderation Routes
 *
 * All routes require: authentication + role of 'admin' OR 'moderator'
 * Students will receive 403 on every endpoint here.
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Apply auth + role guard to every admin route
router.use(requireAuth, requireRole('admin', 'moderator'));

// ── Stats ──────────────────────────────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ── Reports ────────────────────────────────────────────────────────────────────
router.get('/reports', adminController.getReports);
router.get('/reports/:id', adminController.getReportById);
router.patch('/reports/:id', adminController.updateReport);

// ── User Management ────────────────────────────────────────────────────────────
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id/unsuspend', adminController.unsuspendUser);
// Role change is admin-only (enforced inside the controller)
router.patch('/users/:id/role', adminController.changeUserRole);

// ── Listings ───────────────────────────────────────────────────────────────────
router.get('/listings', adminController.getListings);
router.patch('/listings/:id/hide', adminController.hideListing);
router.patch('/listings/:id/approve', adminController.approveListing);

// ── Verification Queue ─────────────────────────────────────────────────────────
router.get('/verification-queue', adminController.getVerificationQueue);
router.patch('/verification-queue/:id/approve', adminController.approveVerification);

// ── Pending Accounts (non-university Google OAuth users) ───────────────────────
router.get('/pending-accounts', adminController.getPendingAccounts);
router.patch('/users/:id/approve', adminController.approveAccount);

// ── Audit Log ──────────────────────────────────────────────────────────────────
router.get('/audit-log', adminController.getAuditLog);

export default router;
