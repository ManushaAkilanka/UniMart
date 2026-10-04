/**
 * Admin & Moderation API Integration Tests
 *
 * Tests:
 *  - Regular students get 403 on every admin route
 *  - Moderators can access reports, suspend users, hide listings
 *  - Admins can change roles
 *  - Stats endpoint returns correct shape
 *  - Verification queue and audit log work
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB } from './helpers/testDB.js';
import { User, Category, Listing, Report } from '../models/index.js';

vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-admin' }),
  sendNotificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-admin-notif' }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
async function registerUser(data) {
  const res = await request(app).post('/api/auth/register').send(data);
  const token = res.headers['set-cookie'][0].split(';')[0].replace('token=', '');
  return { token, userId: res.body.data.user._id };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Setup ─────────────────────────────────────────────────────────────────────
let studentToken, studentId;
let modToken, modId;
let adminToken, adminId;
let testCategory, testListing, testReport;

beforeAll(async () => {
  await setupTestDB();

  // Register student
  ({ token: studentToken, userId: studentId } = await registerUser({
    fullName: 'Student Perera',
    email: 'student.perera@sci.cmb.ac.lk',
    password: 'Password123!',
  }));

  // Register moderator (register as student, then elevate)
  ({ token: modToken, userId: modId } = await registerUser({
    fullName: 'Mod Silva',
    email: 'mod.silva@sci.cmb.ac.lk',
    password: 'Password123!',
  }));
  await User.findByIdAndUpdate(modId, { role: 'moderator', isVerified: true });

  // Register admin
  ({ token: adminToken, userId: adminId } = await registerUser({
    fullName: 'Admin Fernando',
    email: 'admin.fernando@sci.cmb.ac.lk',
    password: 'Password123!',
  }));
  await User.findByIdAndUpdate(adminId, { role: 'admin', isVerified: true });

  // Mark student as verified
  await User.findByIdAndUpdate(studentId, { isVerified: true });

  // Create a test category and listing for context
  testCategory = await Category.create({ name: 'Textbooks', slug: 'textbooks' });
  testListing = await Listing.create({
    sellerId: studentId,
    title: 'Physics Textbook Vol 2',
    description: 'Great condition physics textbook for G3 students.',
    categoryId: testCategory._id,
    listingType: 'sale',
    price: 3500,
    condition: 'used-good',
    campus: 'University of Colombo',
    status: 'active',
  });

  // Create a pending report
  testReport = await Report.create({
    reporterId: studentId,
    targetType: 'listing',
    targetId: testListing._id,
    reason: 'spam',
    details: 'This looks like a spam listing.',
  });
});

afterAll(async () => {
  await teardownTestDB();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UniMart Admin & Moderation API', () => {

  // ── Access Control ──────────────────────────────────────────────────────────
  describe('Access Control — students get 403 on every admin route', () => {
    const ADMIN_ROUTES = [
      { method: 'get', path: '/api/admin/stats' },
      { method: 'get', path: '/api/admin/reports' },
      { method: 'get', path: '/api/admin/users' },
      { method: 'get', path: '/api/admin/listings' },
      { method: 'get', path: '/api/admin/verification-queue' },
      { method: 'get', path: '/api/admin/audit-log' },
    ];

    for (const route of ADMIN_ROUTES) {
      it(`student gets 403 on ${route.method.toUpperCase()} ${route.path}`, async () => {
        const res = await request(app)
          [route.method](route.path)
          .set(authHeader(studentToken));
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    }

    it('unauthenticated request gets 401 on /api/admin/stats', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
    });
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  describe('GET /api/admin/stats', () => {
    it('moderator can fetch stats with correct shape', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const s = res.body.stats;
      expect(typeof s.openReports).toBe('number');
      expect(typeof s.totalUsers).toBe('number');
      expect(typeof s.suspendedUsers).toBe('number');
      expect(typeof s.pendingVerification).toBe('number');
      expect(typeof s.totalListings).toBe('number');
      expect(typeof s.hiddenListings).toBe('number');
      expect(s.openReports).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Reports ─────────────────────────────────────────────────────────────────
  describe('GET /api/admin/reports', () => {
    it('moderator can list reports', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reports)).toBe(true);
      expect(res.body.reports.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by status=pending', async () => {
      const res = await request(app)
        .get('/api/admin/reports?status=pending')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.reports.every((r) => r.status === 'pending')).toBe(true);
    });

    it('moderator can get report detail', async () => {
      const res = await request(app)
        .get(`/api/admin/reports/${testReport._id}`)
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.report.reason).toBe('spam');
      expect(res.body.report.targetDoc).toBeTruthy();
    });

    it('moderator can resolve a report', async () => {
      const res = await request(app)
        .patch(`/api/admin/reports/${testReport._id}`)
        .set(authHeader(modToken))
        .send({ status: 'resolved', resolution: 'Listing has been reviewed. No violation found.' });
      expect(res.status).toBe(200);
      expect(res.body.report.status).toBe('resolved');
      expect(res.body.report.reviewedBy).toBeTruthy();
    });

    it('returns 400 for invalid status', async () => {
      const res = await request(app)
        .patch(`/api/admin/reports/${testReport._id}`)
        .set(authHeader(modToken))
        .send({ status: 'banana' });
      expect(res.status).toBe(400);
    });
  });

  // ── User Management ─────────────────────────────────────────────────────────
  describe('GET/PATCH /api/admin/users', () => {
    it('moderator can list users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('filters by role=student', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=student')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.users.every((u) => u.role === 'student')).toBe(true);
    });

    it('moderator can suspend a student', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${studentId}/suspend`)
        .set(authHeader(modToken))
        .send({ reason: 'Suspected fraud activity.' });
      expect(res.status).toBe(200);
      expect(res.body.user.isSuspended).toBe(true);
    });

    it('moderator can unsuspend the student', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${studentId}/unsuspend`)
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.user.isSuspended).toBe(false);
    });

    it('moderator cannot change roles (only admin can)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${studentId}/role`)
        .set(authHeader(modToken))
        .send({ role: 'moderator' });
      expect(res.status).toBe(403);
    });

    it('admin can change a user role', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${studentId}/role`)
        .set(authHeader(adminToken))
        .send({ role: 'student' }); // keep as student
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('student');
    });
  });

  // ── Listings ────────────────────────────────────────────────────────────────
  describe('Admin Listing Management', () => {
    it('moderator can list all listings', async () => {
      const res = await request(app)
        .get('/api/admin/listings')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.listings)).toBe(true);
    });

    it('moderator can hide a listing', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${testListing._id}/hide`)
        .set(authHeader(modToken))
        .send({ reason: 'Prohibited item in listing.' });
      expect(res.status).toBe(200);
      expect(res.body.listing.status).toBe('hidden');
    });

    it('moderator can re-approve a listing', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${testListing._id}/approve`)
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.listing.status).toBe('active');
    });
  });

  // ── Verification Queue ───────────────────────────────────────────────────────
  describe('Verification Queue', () => {
    let unverifiedId;

    it('moderator can get the verification queue', async () => {
      // Create an unverified user first
      const { userId } = await registerUser({
        fullName: 'Unverified Student',
        email: 'unverified.kalu@sci.cmb.ac.lk',
        password: 'Password123!',
      });
      unverifiedId = userId;

      const res = await request(app)
        .get('/api/admin/verification-queue')
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.some((u) => u._id === unverifiedId)).toBe(true);
    });

    it('moderator can manually verify a user', async () => {
      const res = await request(app)
        .patch(`/api/admin/verification-queue/${unverifiedId}/approve`)
        .set(authHeader(modToken));
      expect(res.status).toBe(200);
      expect(res.body.user.isVerified).toBe(true);
    });
  });

  // ── Audit Log ────────────────────────────────────────────────────────────────
  describe('GET /api/admin/audit-log', () => {
    it('admin can retrieve the audit log', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
      // Should have at least the actions we performed (suspend, unsuspend, resolve, hide, approve)
      expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
    });

    it('student gets 403 on audit log', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set(authHeader(studentToken));
      expect(res.status).toBe(403);
    });
  });
});
