/**
 * Favorites & User Profile API Integration Tests
 *
 * Covers:
 *  - GET  /api/favorites          (authenticated, paginated)
 *  - GET  /api/favorites/ids      (lightweight ID set for UI hydration)
 *  - POST /api/favorites          (add, idempotent, own-listing rule, 404 rule)
 *  - DELETE /api/favorites/:listingId (ownership — only the saver can remove)
 *
 *  - GET  /api/users/me           (authenticated own profile)
 *  - PATCH /api/users/me          (update allowed fields; blocked fields; email privacy)
 *  - GET  /api/users/:id/profile  (public seller profile — NEVER exposes email or studentId)
 *  - GET  /api/users/:id/listings (public active listings for a seller)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { User, Category, Listing, Favorite } from '../models/index.js';

// Mock the email service so no real emails are sent during tests
vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
}));

// ── Test Fixtures ─────────────────────────────────────────────────────────────
const userAData = {
  fullName: 'Student Alice',
  email: 'alice@sci.cmb.ac.lk',
  password: 'Password123!',
};

const userBData = {
  fullName: 'Student Bob',
  email: 'bob@eng.mrt.ac.lk',
  password: 'Password123!',
};

let tokenA = '';
let tokenB = '';
let userAId = '';
let userBId = '';
let categoryId = null;
let listingA = null; // owned by User A
let listingB = null; // owned by User B

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndGetToken(userData) {
  const res = await request(app).post('/api/auth/register').send(userData);
  expect(res.status).toBe(201);
  const token = res.headers['set-cookie'][0].split(';')[0].replace('token=', '');
  const userId = res.body.data.user._id;
  return { token, userId };
}

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('UniMart Favorites & User Profile API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Seed category
    const cat = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      icon: 'laptop',
      sortOrder: 1,
      isActive: true,
    });
    categoryId = cat._id;

    // Register users
    const a = await registerAndGetToken(userAData);
    tokenA = a.token;
    userAId = a.userId;

    const b = await registerAndGetToken(userBData);
    tokenB = b.token;
    userBId = b.userId;

    // Seed listings
    listingA = await Listing.create({
      sellerId: userAId,
      title: "Alice's Laptop",
      description: 'Good condition ThinkPad for sale on campus.',
      categoryId,
      listingType: 'sale',
      price: 80000,
      condition: 'used-good',
      campus: 'University of Colombo',
      status: 'active',
    });

    listingB = await Listing.create({
      sellerId: userBId,
      title: "Bob's Calculator",
      description: 'Casio scientific calculator for engineering students.',
      categoryId,
      listingType: 'sale',
      price: 6500,
      condition: 'like-new',
      campus: 'University of Moratuwa',
      status: 'active',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/favorites
  // ═══════════════════════════════════════════════════════════════════════════
  describe('POST /api/favorites', () => {
    it('returns 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .send({ listingId: listingB._id.toString() });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('allows authenticated User B to favorite User A listing', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ listingId: listingA._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadySaved).toBe(false);
      expect(res.body.data.favoriteId).toBeDefined();

      // Verify in DB
      const fav = await Favorite.findOne({ userId: userBId, listingId: listingA._id });
      expect(fav).not.toBeNull();
    });

    it('is idempotent — returns 200 alreadySaved:true when favorited again', async () => {
      // First add
      await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ listingId: listingA._id.toString() });

      // Second add
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ listingId: listingA._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alreadySaved).toBe(true);

      // Only one record in DB
      const count = await Favorite.countDocuments({ userId: userBId, listingId: listingA._id });
      expect(count).toBe(1);
    });

    it('PREVENTS User A from favoriting their OWN listing (ownership rule)', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ listingId: listingA._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('own listing');

      // Verify not saved in DB
      const count = await Favorite.countDocuments({ userId: userAId });
      expect(count).toBe(0);
    });

    it('returns 404 when trying to favorite a non-existent listing', async () => {
      const nonExistentId = '6793cf84196d9cb239e24699';
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ listingId: nonExistentId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid listing ID format', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ listingId: 'not-a-valid-id' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for an inactive (hidden) listing', async () => {
      const hiddenListing = await Listing.create({
        sellerId: userAId,
        title: 'Hidden Draft Item',
        description: 'This listing is not visible to the public.',
        categoryId,
        listingType: 'sale',
        price: 5000,
        condition: 'new',
        campus: 'University of Colombo',
        status: 'hidden',
      });

      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ listingId: hiddenListing._id.toString() });

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/favorites/:listingId
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DELETE /api/favorites/:listingId', () => {
    beforeEach(async () => {
      // User B favorites listing A
      await Favorite.create({ userId: userBId, listingId: listingA._id });
    });

    it('returns 401 if not authenticated', async () => {
      const res = await request(app).delete(`/api/favorites/${listingA._id}`);
      expect(res.status).toBe(401);
    });

    it('allows User B (the saver) to remove their own favorite', async () => {
      const res = await request(app)
        .delete(`/api/favorites/${listingA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify removed from DB
      const fav = await Favorite.findOne({ userId: userBId, listingId: listingA._id });
      expect(fav).toBeNull();
    });

    it("PREVENTS User A from removing User B's saved favorite (ownership rule)", async () => {
      // User A tries to delete the favorite that User B saved (listingA is A's listing)
      // But the Favorite record belongs to User B (userId = userBId)
      // User A should get 404 because there's no Favorite record with userId=userAId
      const res = await request(app)
        .delete(`/api/favorites/${listingA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Favorite not found');

      // Verify User B's favorite is still in DB
      const fav = await Favorite.findOne({ userId: userBId, listingId: listingA._id });
      expect(fav).not.toBeNull();
    });

    it('returns 404 when trying to remove a non-existent favorite', async () => {
      const res = await request(app)
        .delete(`/api/favorites/${listingB._id}`) // User B never favorited listingB (it's their own)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid listing ID format', async () => {
      const res = await request(app)
        .delete('/api/favorites/invalid-id')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/favorites
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/favorites', () => {
    beforeEach(async () => {
      // User B favorites listingA
      await Favorite.create({ userId: userBId, listingId: listingA._id });
    });

    it('returns 401 if not authenticated', async () => {
      const res = await request(app).get('/api/favorites');
      expect(res.status).toBe(401);
    });

    it("returns User B's favorites with populated listing data", async () => {
      const res = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.favorites).toHaveLength(1);

      const item = res.body.data.favorites[0];
      expect(item.listing._id).toBe(listingA._id.toString());
      expect(item.listing.title).toBe("Alice's Laptop");
      expect(item.savedAt).toBeDefined();
    });

    it("does NOT expose seller email in favorites listing data", async () => {
      const res = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      const item = res.body.data.favorites[0];
      // sellerId is populated but should not have email
      expect(item.listing.sellerId.email).toBeUndefined();
      expect(item.listing.sellerId.studentId).toBeUndefined();
      expect(item.listing.sellerId.fullName).toBeDefined();
    });

    it('returns empty array when user has no favorites', async () => {
      const res = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.favorites).toHaveLength(0);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it("does NOT return other users' favorites", async () => {
      // User A also favorites listingB
      await Favorite.create({ userId: userAId, listingId: listingB._id });

      const resB = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${tokenB}`);

      // User B should only see their own favorites
      expect(resB.body.data.favorites).toHaveLength(1);
      expect(resB.body.data.favorites[0].listing._id).toBe(listingA._id.toString());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/favorites/ids
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/favorites/ids', () => {
    it('returns 401 if not authenticated', async () => {
      const res = await request(app).get('/api/favorites/ids');
      expect(res.status).toBe(401);
    });

    it('returns the set of listing IDs the user has favorited', async () => {
      await Favorite.create({ userId: userBId, listingId: listingA._id });

      const res = await request(app)
        .get('/api/favorites/ids')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ids).toContain(listingA._id.toString());
      expect(res.body.data.ids).not.toContain(listingB._id.toString());
    });

    it('returns empty array when user has no favorites', async () => {
      const res = await request(app)
        .get('/api/favorites/ids')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ids).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/users/me
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/users/me', () => {
    it('returns 401 if not authenticated', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('returns the authenticated user own profile with all fields', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user._id).toBe(userAId);
      expect(res.body.data.user.fullName).toBe(userAData.fullName);
      // Own profile may include email
      expect(res.body.data.user.email).toBeDefined();
    });

    it('never exposes passwordHash in own profile response', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.body.data.user.passwordHash).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/users/me
  // ═══════════════════════════════════════════════════════════════════════════
  describe('PATCH /api/users/me', () => {
    it('returns 401 if not authenticated', async () => {
      const res = await request(app).patch('/api/users/me').send({ fullName: 'New Name' });
      expect(res.status).toBe(401);
    });

    it('allows updating fullName, faculty, campus, avatarUrl', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          fullName: 'Alice Updated',
          faculty: 'Faculty of Science',
          campus: 'University of Colombo',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.fullName).toBe('Alice Updated');
      expect(res.body.data.user.faculty).toBe('Faculty of Science');
      expect(res.body.data.user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('allows uploading a custom profile picture file via multipart/form-data', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .field('fullName', 'Alice Photo Profile')
        .attach('avatar', validJpegBuffer, 'profile.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.avatarUrl).toBeDefined();
      expect(res.body.data.user.avatarUrl).toContain('unimart/avatars');

      const userInDb = await User.findById(userAId).lean();
      expect(userInDb.avatarUrl).toContain('unimart/avatars');
    });

    it('rejects avatar file upload with invalid magic bytes / file signature', async () => {
      const fakeExeBuffer = Buffer.from('MZ Not a valid photo file at all');

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .field('fullName', 'Alice Bad File')
        .attach('avatar', fakeExeBuffer, 'virus.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid file signature');
    });

    it('PREVENTS changing email via profile update (ignored, not persisted)', async () => {
      const originalEmail = userAData.email;

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          email: 'hacked@evil.com',
          fullName: 'Alice',
        });

      // Should succeed (email field ignored) or return 200
      expect([200, 400]).toContain(res.status);

      // Verify email was NOT changed in DB
      const userInDb = await User.findById(userAId).lean();
      expect(userInDb.email).toBe(originalEmail);
    });

    it('PREVENTS changing studentId via profile update', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          studentId: 'SC/2021/999',
          fullName: 'Alice',
        });

      expect([200, 400]).toContain(res.status);

      // Verify studentId was NOT changed (should remain null/original)
      const userInDb = await User.findById(userAId).lean();
      expect(userInDb.studentId).not.toBe('SC/2021/999');
    });

    it('returns 400 for fullName shorter than 2 characters', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ fullName: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid avatarUrl', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ avatarUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when no valid fields are provided', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ invalidField: 'whatever' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('never exposes passwordHash in update response', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ fullName: 'Alice New' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/users/:id/profile  (public seller profile)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/users/:id/profile', () => {
    it('returns public profile without authentication', async () => {
      const res = await request(app).get(`/api/users/${userAId}/profile`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seller.fullName).toBeDefined();
    });

    it('NEVER exposes email in public seller profile', async () => {
      const res = await request(app).get(`/api/users/${userAId}/profile`);

      expect(res.status).toBe(200);
      expect(res.body.data.seller.email).toBeUndefined();
    });

    it('NEVER exposes studentId in public seller profile', async () => {
      // Set a studentId in the DB first
      await User.findByIdAndUpdate(userAId, { studentId: 'SC/2021/001' });

      const res = await request(app).get(`/api/users/${userAId}/profile`);

      expect(res.status).toBe(200);
      expect(res.body.data.seller.studentId).toBeUndefined();
    });

    it('NEVER exposes passwordHash in public seller profile', async () => {
      const res = await request(app).get(`/api/users/${userAId}/profile`);
      expect(res.body.data.seller.passwordHash).toBeUndefined();
    });

    it('returns 404 for a non-existent user', async () => {
      const res = await request(app).get('/api/users/6793cf84196d9cb239e24699/profile');
      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid ID format', async () => {
      const res = await request(app).get('/api/users/not-an-id/profile');
      expect(res.status).toBe(400);
    });

    it('includes only safe public fields (fullName, faculty, campus, avatarUrl, isVerified, role, createdAt)', async () => {
      await User.findByIdAndUpdate(userAId, {
        faculty: 'Faculty of Science',
        campus: 'University of Colombo',
      });

      const res = await request(app).get(`/api/users/${userAId}/profile`);

      expect(res.status).toBe(200);
      const seller = res.body.data.seller;

      expect(seller.fullName).toBeDefined();
      expect(seller.faculty).toBeDefined();
      expect(seller.campus).toBeDefined();
      expect(seller.isVerified).toBeDefined();
      expect(seller.role).toBeDefined();
      expect(seller.createdAt).toBeDefined();

      // Sensitive fields must be absent
      expect(seller.email).toBeUndefined();
      expect(seller.studentId).toBeUndefined();
      expect(seller.passwordHash).toBeUndefined();
      expect(seller.isSuspended).toBeUndefined();
      expect(seller.suspendedReason).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/users/:id/listings  (public active listings for a seller)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/users/:id/listings', () => {
    it('returns active listings for a seller without authentication', async () => {
      const res = await request(app).get(`/api/users/${userAId}/listings`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listings).toHaveLength(1);
      expect(res.body.data.listings[0].title).toBe("Alice's Laptop");
    });

    it('does NOT return non-active (hidden/sold) listings in seller public page', async () => {
      // Create a hidden listing for user A
      await Listing.create({
        sellerId: userAId,
        title: "Alice's Secret Draft",
        description: 'This is not public and should not appear on the seller page.',
        categoryId,
        listingType: 'sale',
        price: 10000,
        condition: 'new',
        campus: 'University of Colombo',
        status: 'hidden',
      });

      const res = await request(app).get(`/api/users/${userAId}/listings`);

      expect(res.status).toBe(200);
      expect(res.body.data.listings).toHaveLength(1); // Only the 'active' one
      const statuses = res.body.data.listings.map((l) => l.status);
      expect(statuses.every((s) => s === 'active')).toBe(true);
    });

    it("does NOT include seller email in listings data", async () => {
      const res = await request(app).get(`/api/users/${userAId}/listings`);
      // The listing itself does not expose seller email via this endpoint
      // (sellerId not populated here, no email in listing document)
      expect(res.status).toBe(200);
      const listing = res.body.data.listings[0];
      // sellerId field should be just an ID, not a populated object with email
      if (typeof listing.sellerId === 'object' && listing.sellerId !== null) {
        expect(listing.sellerId.email).toBeUndefined();
      }
    });

    it('returns 404 for a non-existent seller', async () => {
      const res = await request(app).get('/api/users/6793cf84196d9cb239e24699/listings');
      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid ID format', async () => {
      const res = await request(app).get('/api/users/bad-id/listings');
      expect(res.status).toBe(400);
    });

    it('returns pagination metadata', async () => {
      const res = await request(app).get(`/api/users/${userAId}/listings`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.pagination.page).toBe(1);
    });
  });
});
