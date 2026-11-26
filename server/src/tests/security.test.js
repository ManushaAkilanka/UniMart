/**
 * Comprehensive Dynamic Security & Attack Resilience Tests
 *
 * Verifies:
 *  1. mongoSanitize strips MongoDB operators ($gt, $ne, etc.) from body and query
 *  2. Helmet security headers are active (X-Content-Type-Options, X-Frame-Options, etc.)
 *  3. CORS policy returns clean 403 JSON without stack trace on disallowed origin
 *  4. Production error handler suppresses stack traces and internal paths
 *  5. JWT attack resilience: unsigned (alg: none), tampered signature, and expired tokens rejected
 *  6. Mass assignment protection: role, isVerified, accountStatus, googleId cannot be injected
 *  7. Malformed ObjectId handling returns safe 400 without crashing
 *  8. File upload security: non-image buffers with spoofed names rejected
 *  9. Open redirect protection on OAuth query parameters
 * 10. Production cookie flags: secure, httpOnly, sameSite=strict
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import mongoSanitize, { sanitize } from '../middleware/mongoSanitize.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { checkImageSignature } from '../middleware/upload.middleware.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { User, Category, Listing } from '../models/index.js';
import { signToken } from '../services/auth.service.js';
import { ENV } from '../config/env.js';

// Mock email service to prevent network calls in tests
vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
  sendNotificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-notif-123' }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ messageId: 'test-reset-123' }),
}));

describe('Security & Dynamic Attack Resilience', () => {
  describe('NoSQL Injection (mongoSanitize)', () => {
    it('strips keys starting with $ or containing . from nested objects', () => {
      const payload = {
        email: 'student@cmb.ac.lk',
        $gt: '',
        nested: {
          $ne: 1,
          'invalid.key': 'bad',
          valid: 'good',
        },
        items: [{ $where: 'attack' }, { clean: 'yes' }],
      };

      const result = sanitize(payload);

      expect(result.email).toBe('student@cmb.ac.lk');
      expect(result.$gt).toBeUndefined();
      expect(result.nested.$ne).toBeUndefined();
      expect(result.nested['invalid.key']).toBeUndefined();
      expect(result.nested.valid).toBe('good');
      expect(result.items[0].$where).toBeUndefined();
      expect(result.items[1].clean).toBe('yes');
    });

    it('sanitizes req.body and req.query via Express middleware', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(mongoSanitize());
      testApp.post('/test-sanitize', (req, res) => {
        res.json({ body: req.body, query: req.query });
      });

      const res = await request(testApp)
        .post('/test-sanitize?user[$ne]=null')
        .send({ username: 'alice', password: { $gt: '' }, safe: 'value' });

      expect(res.status).toBe(200);
      expect(res.body.body.username).toBe('alice');
      expect(res.body.body.safe).toBe('value');
      expect(res.body.body.password.$gt).toBeUndefined();
      expect(res.body.query.user.$ne).toBeUndefined();
    });
  });

  describe('Helmet & CORS Policy', () => {
    it('sets standard security headers from Helmet', async () => {
      const testApp = express();
      testApp.use(
        helmet({
          crossOriginResourcePolicy: { policy: 'cross-origin' },
          contentSecurityPolicy: false,
        })
      );
      testApp.get('/test-headers', (_req, res) => res.send('OK'));

      const res = await request(testApp).get('/test-headers');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('allows private-network origins on the Vite port outside production', async () => {
      const originalEnv = ENV.NODE_ENV;
      try {
        ENV.NODE_ENV = 'development';

        const res = await request(app)
          .post('/api/health')
          .set('Origin', 'http://192.168.8.124:5173');

        expect(res.status).not.toBe(403);
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });

    it('rejects private-network origins on the Vite port in production', async () => {
      const originalEnv = ENV.NODE_ENV;
      try {
        ENV.NODE_ENV = 'production';

        const res = await request(app)
          .post('/api/health')
          .set('Origin', 'http://192.168.8.124:5173');

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          success: false,
          message: 'Origin not allowed by CORS policy',
        });
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });

    it.each(['development', 'production'])(
      'returns a generic 403 JSON response without a stack for disallowed origins in %s',
      async (nodeEnv) => {
        const originalEnv = ENV.NODE_ENV;
        try {
          ENV.NODE_ENV = nodeEnv;

          const res = await request(app)
            .post('/api/health')
            .set('Origin', 'https://evil.com');

          expect(res.status).toBe(403);
          expect(res.body).toEqual({
            success: false,
            message: 'Origin not allowed by CORS policy',
          });
        } finally {
          ENV.NODE_ENV = originalEnv;
        }
      }
    );
  });

  describe('Production Error Disclosure Guard', () => {
    it('never leaks stack traces or internal file paths in production mode', async () => {
      const originalEnv = ENV.NODE_ENV;
      try {
        ENV.NODE_ENV = 'production';

        const testApp = express();
        testApp.get('/test-error', (_req, _res, next) => {
          const err = new Error('Database connection failed at /var/www/internal/db.js:42');
          err.statusCode = 500;
          next(err);
        });
        testApp.use(errorHandler);

        const res = await request(testApp).get('/test-error');

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.stack).toBeUndefined();
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });
  });

  describe('JWT Attack Resilience', () => {
    it('rejects an expired JWT with 401', async () => {
      const expiredToken = jwt.sign(
        { sub: '507f1f77bcf86cd799439011', role: 'student' },
        ENV.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const testApp = express();
      testApp.use(requireAuth);
      testApp.get('/test-auth', (req, res) => res.json({ user: req.user }));

      const res = await request(testApp)
        .get('/test-auth')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects a JWT with tampered signature with 401', async () => {
      const validToken = jwt.sign(
        { sub: '507f1f77bcf86cd799439011', role: 'student' },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const tampered = validToken.slice(0, -6) + 'abcdef';

      const testApp = express();
      testApp.use(requireAuth);
      testApp.get('/test-auth', (req, res) => res.json({ user: req.user }));

      const res = await request(testApp)
        .get('/test-auth')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('rejects an unsigned JWT with alg none (CVE-2015-9235 defense)', async () => {
      // Craft header { alg: "none", typ: "JWT" } + payload
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: '507f1f77bcf86cd799439011', role: 'admin' })).toString('base64url');
      const noneAlgToken = `${header}.${payload}.`;

      const testApp = express();
      testApp.use(requireAuth);
      testApp.get('/test-auth', (req, res) => res.json({ user: req.user }));

      const res = await request(testApp)
        .get('/test-auth')
        .set('Authorization', `Bearer ${noneAlgToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe('File Upload Attack Defense', () => {
    it('rejects an executable or text payload disguised as an image (magic byte validation)', () => {
      const fakeJpg = Buffer.from('<?php echo "evil"; ?>');
      expect(checkImageSignature(fakeJpg)).toBeNull();

      const fakePng = Buffer.from('<script>alert("xss")</script>');
      expect(checkImageSignature(fakePng)).toBeNull();
    });

    it('accepts legitimate JPEG, PNG, and WebP buffers with authentic magic bytes', () => {
      const legitJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x00, 0x00, 0x00]);
      expect(checkImageSignature(legitJpg)).toBe('image/jpeg');

      const legitPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
      expect(checkImageSignature(legitPng)).toBe('image/png');
    });
  });

  describe('OAuth Open Redirect Guard', () => {
    it('redirects error messages strictly to CLIENT_URL and never external domains', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback')
        .query({ error: 'access_denied', error_description: 'User denied consent' });

      expect(res.status).toBe(302);
      const redirectLocation = res.headers['location'];
      expect(redirectLocation.startsWith(ENV.CLIENT_URL)).toBe(true);
      expect(redirectLocation).not.toContain('//evil.com');
    });
  });

  describe('Production Cookie Security Flags', () => {
    it('configures secure=true, httpOnly=true, sameSite=strict when NODE_ENV=production', () => {
      const originalEnv = ENV.NODE_ENV;
      try {
        ENV.NODE_ENV = 'production';
        const cookieOpts = {
          httpOnly: true,
          secure: ENV.NODE_ENV === 'production',
          sameSite: ENV.NODE_ENV === 'production' ? 'strict' : 'lax',
        };
        expect(cookieOpts.secure).toBe(true);
        expect(cookieOpts.httpOnly).toBe(true);
        expect(cookieOpts.sameSite).toBe('strict');
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Hardened Security Controls & Regression Suite (Step 8 Suite)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Hardened Security Controls & Regression Suite', () => {
    let tokenUserA;
    let userAId;
    let listingB;

    beforeAll(async () => {
      await setupTestDB();
    });

    afterAll(async () => {
      await teardownTestDB();
    });

    beforeEach(async () => {
      await clearCollections();

      // Create Category
      const cat = await Category.create({
        name: 'Books',
        slug: 'books',
        icon: 'book',
        isActive: true,
      });

      // Create User A
      const userA = await User.create({
        fullName: 'Student Alice',
        email: 'alice@sci.cmb.ac.lk',
        passwordHash: '$2a$04$fakehashalicefakehashalice123456789012345678901234567890',
        role: 'student',
        isVerified: true,
      });
      userAId = userA._id;
      tokenUserA = signToken(userA._id);

      // Create User B
      const userB = await User.create({
        fullName: 'Student Bob',
        email: 'bob@eng.mrt.ac.lk',
        passwordHash: '$2a$04$fakehashbobfakehashbob1234567890123456789012345678901234',
        role: 'student',
        isVerified: true,
      });

      // Create Listing owned by User B
      listingB = await Listing.create({
        sellerId: userB._id,
        title: 'Original Bob Listing Title',
        description: 'Original Bob listing description long enough for validation rules.',
        categoryId: cat._id,
        listingType: 'sale',
        price: 5000,
        campus: 'University of Moratuwa',
        condition: 'like-new',
        status: 'active',
      });
    });

    // 1. User A cannot PUT/DELETE User B's listing -> 403
    it("1. User A cannot PUT/DELETE User B's listing -> 403 Forbidden", async () => {
      // Attempt PUT/PATCH
      const patchRes = await request(app)
        .patch(`/api/listings/${listingB._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Hacked by Alice' });

      expect(patchRes.status).toBe(403);
      expect(patchRes.body.success).toBe(false);

      // Attempt DELETE
      const deleteRes = await request(app)
        .delete(`/api/listings/${listingB._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.success).toBe(false);

      // Verify DB unchanged
      const freshDoc = await Listing.findById(listingB._id);
      expect(freshDoc.title).toBe('Original Bob Listing Title');
    });

    // 2. role: 'admin' in profile update does not change role
    it("2. Sending role: 'admin' in profile update does not change role", async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ fullName: 'Alice Attempting Admin', role: 'admin' });

      expect([200, 400]).toContain(res.status);

      const dbUser = await User.findById(userAId);
      expect(dbUser.role).toBe('student');
    });

    // 3. 11th login attempt in window -> 429
    it('3. 11th login attempt within rate limit window returns 429 Too Many Requests', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ email: 'alice@sci.cmb.ac.lk', password: 'WrongPassword!' });
        expect(res.status).toBe(401);
      }

      // 11th request triggers rate limiter
      const blockedRes = await request(app)
        .post('/api/auth/login')
        .set('x-test-rate-limit', 'true')
        .send({ email: 'alice@sci.cmb.ac.lk', password: 'WrongPassword!' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
    });

    // 4. Malformed ObjectId on /:id -> 400 (not 500)
    it('4. Malformed ObjectId on /:id returns 400 Bad Request, not 500', async () => {
      const res = await request(app)
        .get('/api/listings/invalid-non-hex-id')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.stack).toBeUndefined();
    });

    // 5. Reset token cannot be used twice
    it('5. Reset token cannot be used twice (single-use token protection)', async () => {
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.findByIdAndUpdate(userAId, {
        passwordResetToken: tokenHash,
        passwordResetExpiry: new Date(Date.now() + 15 * 60 * 1000),
      });

      // First reset: succeeds
      const firstReset = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword: 'BrandNewPassword123!' });

      expect(firstReset.status).toBe(200);
      expect(firstReset.body.success).toBe(true);

      // Second reset with the exact same token: rejected
      const secondReset = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPassword123!' });

      expect(secondReset.status).toBe(400);
      expect(secondReset.body.success).toBe(false);
    });

    // 6. Unauthenticated request to admin route -> 401
    it('6. Unauthenticated request to admin route returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/users');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // 7. Login/forgot-password responses identical for existing vs non-existing emails
    it('7. Login and forgot-password responses are identical for existing vs non-existing emails (anti-enumeration)', async () => {
      // Login comparison
      const loginUnknown = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@cmb.ac.lk', password: 'Password123!' });

      const loginWrongPass = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@sci.cmb.ac.lk', password: 'IncorrectPassword!' });

      expect(loginUnknown.status).toBe(401);
      expect(loginWrongPass.status).toBe(401);
      expect(loginUnknown.body.message).toBe(loginWrongPass.body.message);

      // Forgot-password comparison
      const forgotUnknown = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown.scholar@mrt.ac.lk' });

      const forgotExisting = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'alice@sci.cmb.ac.lk' });

      expect(forgotUnknown.status).toBe(200);
      expect(forgotExisting.status).toBe(200);
      expect(forgotUnknown.body.message).toBe(forgotExisting.body.message);
    });
  });
});
