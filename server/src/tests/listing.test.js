/**
 * Listings & Categories API Integration Tests
 *
 * Covers:
 *  - GET /api/categories
 *  - GET /api/listings (search, category, listingType, price, condition, campus, sort, pagination, facets)
 *  - Zod Query Parameter Whitelisting & NoSQL Injection Protection
 *  - POST /api/listings (authenticated student, suspended block, Multer file signature validation)
 *  - GET /api/listings/:id (safe viewCount increment)
 *  - PATCH /api/listings/:id (ownership protection: user B cannot edit user A's listing)
 *  - PATCH /api/listings/:id/status (mark sold, ownership protection)
 *  - DELETE /api/listings/:id (ownership protection: user B cannot delete user A's listing, image cleanup)
 *  - GET /api/listings/mine (authenticated user's listings)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { User, Category, Listing } from '../models/index.js';

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

const suspendedUserData = {
  fullName: 'Suspended Sam',
  email: 'sam@sci.cmb.ac.lk',
  password: 'Password123!',
};

let userAToken = '';
let userBToken = '';
let suspendedToken = '';
let userAId = '';
let userBId = '';
let categoryAcademic = null;
let categoryElectronics = null;

// JPEG Magic Bytes Buffer (FF D8 FF E0 ...)
const validJpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

// Fake non-image Buffer
const fakePdfBuffer = Buffer.from('%PDF-1.4 Fake malicious executable disguised as image');

describe('UniMart Listings Backend API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // 1. Seed Categories
    categoryAcademic = await Category.create({
      name: 'Academic Gear',
      slug: 'academic-gear',
      icon: 'school',
      sortOrder: 1,
      isActive: true,
    });

    categoryElectronics = await Category.create({
      name: 'Electronics & Laptops',
      slug: 'electronics-laptops',
      icon: 'laptop_mac',
      sortOrder: 2,
      isActive: true,
    });

    // 2. Register Users
    const resA = await request(app).post('/api/auth/register').send(userAData);
    userAToken = resA.body.data.user._id ? resA.headers['set-cookie'][0].split(';')[0].replace('token=', '') : '';
    userAId = resA.body.data.user._id;

    const resB = await request(app).post('/api/auth/register').send(userBData);
    userBToken = resB.headers['set-cookie'][0].split(';')[0].replace('token=', '');
    userBId = resB.body.data.user._id;

    const resSam = await request(app).post('/api/auth/register').send(suspendedUserData);
    suspendedToken = resSam.headers['set-cookie'][0].split(';')[0].replace('token=', '');
    await User.findByIdAndUpdate(resSam.body.data.user._id, {
      isSuspended: true,
      suspendedReason: 'Spam listing violations',
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CATEGORIES ENDPOINT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('GET /api/categories', () => {
    it('returns all active categories ordered by sortOrder', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toHaveLength(2);
      expect(res.body.data.categories[0].slug).toBe('academic-gear');
      expect(res.body.data.categories[1].slug).toBe('electronics-laptops');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // POST /api/listings (Create Listing & Uploads)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('POST /api/listings', () => {
    it('rejects unauthenticated listing creation', async () => {
      const res = await request(app).post('/api/listings').send({
        title: 'Casio Scientific Calculator',
        description: 'Excellent condition for engineering exams',
        categoryId: categoryAcademic._id.toString(),
        listingType: 'sale',
        price: 5500,
        condition: 'like-new',
        campus: 'University of Colombo',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('blocks suspended users from posting listings', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${suspendedToken}`)
        .send({
          title: 'Casio Scientific Calculator',
          description: 'Used for engineering exams',
          categoryId: categoryAcademic._id.toString(),
          listingType: 'sale',
          price: 5500,
          condition: 'like-new',
          campus: 'University of Colombo',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Account suspended');
    });

    it('creates listing successfully for active student', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Casio fx-991EX ClassWiz',
          description: 'Authentic QR code verification present. Battery in great health.',
          categoryId: categoryAcademic.slug,
          listingType: 'sale',
          price: 6500,
          condition: 'like-new',
          campus: 'University of Colombo',
          meetupSpots: ['Science Quadrangle Canteen', 'Main Library Lobby'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing.title).toBe('Casio fx-991EX ClassWiz');
      expect(res.body.data.listing.price).toBe(6500);
      expect(res.body.data.listing.status).toBe('active');
      expect(res.body.data.listing.sellerId._id).toBe(userAId);
    });

    it('validates and rejects non-image file uploads with invalid file signatures', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Engineering Textbook')
        .field('description', 'Solid state physics reference textbook for 2nd year.')
        .field('categoryId', categoryAcademic._id.toString())
        .field('listingType', 'sale')
        .field('price', '3500')
        .field('condition', 'used-good')
        .field('campus', 'University of Colombo')
        .attach('images', fakePdfBuffer, 'malicious.jpg'); // PDF buffer pretending to be JPG

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file signature');
    });

    it('accepts valid JPEG buffer matching file signature and uploads to Cloudinary', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Genuine Laboratory Coat')
        .field('description', 'Clean white cotton lab coat for campus chemistry labs.')
        .field('categoryId', categoryAcademic._id.toString())
        .field('listingType', 'sale')
        .field('price', '2200')
        .field('condition', 'like-new')
        .field('campus', 'University of Colombo')
        .attach('images', validJpegBuffer, 'labcoat.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.listing.images).toHaveLength(1);
      expect(res.body.data.listing.images[0].url).toBeDefined();
      expect(res.body.data.listing.images[0].publicId).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // GET /api/listings (Search, Filters, Facets, Whitelisting & NoSQL Injection)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('GET /api/listings', () => {
    beforeEach(async () => {
      // Seed 3 distinct active listings
      await Listing.create([
        {
          sellerId: userAId,
          title: 'Casio fx-991EX ClassWiz Calculator',
          description: 'High-res natural textbook display for engineering exams',
          categoryId: categoryAcademic._id,
          listingType: 'sale',
          price: 6500,
          condition: 'like-new',
          campus: 'University of Colombo',
          status: 'active',
          viewCount: 10,
        },
        {
          sellerId: userAId,
          title: 'Dell UltraSharp 24 Monitor',
          description: 'IPS color accurate monitor with height adjustable stand',
          categoryId: categoryElectronics._id,
          listingType: 'sale',
          price: 35000,
          condition: 'like-new',
          campus: 'University of Colombo',
          status: 'active',
          viewCount: 50,
        },
        {
          sellerId: userBId,
          title: 'Calculus Handwritten Past Papers and Notes',
          description: 'Complete printed and bound lecture notes for semester 1',
          categoryId: categoryAcademic._id,
          listingType: 'free',
          price: 0,
          condition: 'used-good',
          campus: 'University of Moratuwa',
          status: 'active',
          viewCount: 5,
        },
        {
          sellerId: userAId,
          title: 'Hidden Inactive Draft Listing',
          description: 'This is an inactive hidden listing that should not appear publicly',
          categoryId: categoryAcademic._id,
          listingType: 'sale',
          price: 1000,
          condition: 'used-fair',
          campus: 'University of Colombo',
          status: 'hidden',
          viewCount: 0,
        },
      ]);
    });

    it('returns only active listings and excludes hidden ones', async () => {
      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listings).toHaveLength(3);
      const statuses = res.body.data.listings.map((l) => l.status);
      expect(statuses.every((s) => s === 'active')).toBe(true);
    });

    it('filters listings by search query', async () => {
      const res = await request(app).get('/api/listings?search=calculator');
      expect(res.status).toBe(200);
      expect(res.body.data.listings).toHaveLength(1);
      expect(res.body.data.listings[0].title).toContain('Calculator');
    });

    it('filters listings by category slug', async () => {
      const res = await request(app).get('/api/listings?category=electronics-laptops');
      expect(res.status).toBe(200);
      expect(res.body.data.listings).toHaveLength(1);
      expect(res.body.data.listings[0].title).toContain('Dell UltraSharp');
    });

    it('filters listings by price range and listingType', async () => {
      const res = await request(app).get('/api/listings?minPrice=5000&maxPrice=10000');
      expect(res.status).toBe(200);
      expect(res.body.data.listings).toHaveLength(1);
      expect(res.body.data.listings[0].price).toBe(6500);

      const freeRes = await request(app).get('/api/listings?listingType=free');
      expect(freeRes.status).toBe(200);
      expect(freeRes.body.data.listings).toHaveLength(1);
      expect(freeRes.body.data.listings[0].price).toBe(0);
    });

    it('sorts listings correctly (popular, price_desc)', async () => {
      const resPop = await request(app).get('/api/listings?sort=popular');
      expect(resPop.status).toBe(200);
      expect(resPop.body.data.listings[0].viewCount).toBe(50); // Dell monitor

      const resPrice = await request(app).get('/api/listings?sort=price_desc');
      expect(resPrice.status).toBe(200);
      expect(resPrice.body.data.listings[0].price).toBe(35000);
    });

    it('caps limit at 50 and rejects limit > 50 with validation error', async () => {
      const res = await request(app).get('/api/listings?limit=51');
      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toContain('limit cannot exceed 50');
    });

    it('returns structured category and condition facet counts', async () => {
      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(200);
      expect(res.body.data.facets).toBeDefined();
      expect(res.body.data.facets.categories).toBeDefined();
      expect(res.body.data.facets.conditions).toBeDefined();

      const academicFacet = res.body.data.facets.categories.find(
        (c) => c.slug === 'academic-gear'
      );
      expect(academicFacet.count).toBe(2);

      const electronicsFacet = res.body.data.facets.categories.find(
        (c) => c.slug === 'electronics-laptops'
      );
      expect(electronicsFacet.count).toBe(1);
    });

    it('REJECTS NoSQL injection attempts via un-whitelisted query params', async () => {
      // 1. Operator injection attempt via price[$gt]
      const injectionRes1 = await request(app).get('/api/listings?price[$gt]=0');
      expect(injectionRes1.status).toBe(400);
      expect(injectionRes1.body.message).toBe('Validation error');

      // 2. Unrecognized parameter injection
      const injectionRes2 = await request(app).get('/api/listings?search=calc&$where=function(){return true}');
      expect(injectionRes2.status).toBe(400);
      expect(injectionRes2.body.message).toBe('Validation error');

      // 3. Object-based injection attempt on minPrice
      const injectionRes3 = await request(app).get('/api/listings?minPrice[$ne]=0');
      expect(injectionRes3.status).toBe(400);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // GET /api/listings/:id (Single Listing & View Count)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('GET /api/listings/:id', () => {
    let testListing = null;

    beforeEach(async () => {
      testListing = await Listing.create({
        sellerId: userAId,
        title: 'Casio fx-991EX ClassWiz',
        description: 'Authentic exam calculator with textbook display',
        categoryId: categoryAcademic._id,
        listingType: 'sale',
        price: 6500,
        condition: 'like-new',
        campus: 'University of Colombo',
        status: 'active',
        viewCount: 10,
      });
    });

    it('returns single listing and safely increments viewCount when viewed by guest or other student', async () => {
      // Viewed by User B
      const res = await request(app)
        .get(`/api/listings/${testListing._id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.listing.title).toBe('Casio fx-991EX ClassWiz');
      expect(res.body.data.listing.viewCount).toBe(11);

      // Verify in DB
      const updated = await Listing.findById(testListing._id);
      expect(updated.viewCount).toBe(11);
    });

    it('does NOT increment viewCount when viewed by the listing owner', async () => {
      // Viewed by User A (owner)
      const res = await request(app)
        .get(`/api/listings/${testListing._id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.listing.viewCount).toBe(10); // Not incremented

      const updated = await Listing.findById(testListing._id);
      expect(updated.viewCount).toBe(10);
    });

    it('returns 404 for non-existent listing ID', async () => {
      const res = await request(app).get('/api/listings/6793cf84196d9cb239e24699');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Listing not found.');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PATCH & DELETE /api/listings/:id (Ownership Security Tests)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Listing Ownership & Mutation Protection', () => {
    let listingA = null;

    beforeEach(async () => {
      listingA = await Listing.create({
        sellerId: userAId,
        title: "User A's Original Laptop Listing",
        description: 'ThinkPad T480 with 16GB RAM for programming classes.',
        categoryId: categoryElectronics._id,
        listingType: 'sale',
        price: 85000,
        condition: 'used-good',
        campus: 'University of Colombo',
        status: 'active',
        images: [{ url: 'https://example.com/img1.jpg', publicId: 'test/img1' }],
      });
    });

    it("PREVENTS User B from editing User A's listing (403 Forbidden)", async () => {
      const res = await request(app)
        .patch(`/api/listings/${listingA._id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: "Hacked by User B",
          price: 100,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to edit this listing');

      // Verify DB was NOT modified
      const freshDoc = await Listing.findById(listingA._id);
      expect(freshDoc.title).toBe("User A's Original Laptop Listing");
      expect(freshDoc.price).toBe(85000);
    });

    it("allows User A (owner) to edit their listing successfully", async () => {
      const res = await request(app)
        .patch(`/api/listings/${listingA._id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          price: 82000,
          priceMode: 'negotiable',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.price).toBe(82000);
      expect(res.body.data.listing.priceMode).toBe('negotiable');
    });

    it("PREVENTS User B from updating User A's listing status (403 Forbidden)", async () => {
      const res = await request(app)
        .patch(`/api/listings/${listingA._id}/status`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'sold' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to update this listing');

      const freshDoc = await Listing.findById(listingA._id);
      expect(freshDoc.status).toBe('active');
    });

    it("allows User A (owner) to mark listing as sold", async () => {
      const res = await request(app)
        .patch(`/api/listings/${listingA._id}/status`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'sold' });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe('sold');

      const freshDoc = await Listing.findById(listingA._id);
      expect(freshDoc.status).toBe('sold');
    });

    it("PREVENTS User B from deleting User A's listing (403 Forbidden)", async () => {
      const res = await request(app)
        .delete(`/api/listings/${listingA._id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to delete this listing');

      const freshDoc = await Listing.findById(listingA._id);
      expect(freshDoc).not.toBeNull();
    });

    it("allows User A (owner) to delete their listing", async () => {
      const res = await request(app)
        .delete(`/api/listings/${listingA._id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Listing deleted successfully.');

      const freshDoc = await Listing.findById(listingA._id);
      expect(freshDoc).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // GET /api/listings/mine
  // ═════════════════════════════════════════════════════════════════════════════
  describe('GET /api/listings/mine', () => {
    beforeEach(async () => {
      await Listing.create([
        {
          sellerId: userAId,
          title: "User A Active Item",
          description: 'Listing description with sufficient length for validation.',
          categoryId: categoryAcademic._id,
          listingType: 'sale',
          price: 1500,
          condition: 'new',
          campus: 'University of Colombo',
          status: 'active',
        },
        {
          sellerId: userAId,
          title: "User A Sold Item",
          description: 'Listing description with sufficient length for validation.',
          categoryId: categoryAcademic._id,
          listingType: 'sale',
          price: 2500,
          condition: 'like-new',
          campus: 'University of Colombo',
          status: 'sold',
        },
        {
          sellerId: userBId,
          title: "User B Active Item",
          description: 'Listing description with sufficient length for validation.',
          categoryId: categoryElectronics._id,
          listingType: 'sale',
          price: 9500,
          condition: 'used-good',
          campus: 'University of Moratuwa',
          status: 'active',
        },
      ]);
    });

    it("returns all user's listings including active and sold items", async () => {
      const res = await request(app)
        .get('/api/listings/mine')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listings).toHaveLength(2);
      const titles = res.body.data.listings.map((l) => l.title);
      expect(titles).toContain('User A Active Item');
      expect(titles).toContain('User A Sold Item');
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/listings/mine');
      expect(res.status).toBe(401);
    });
  });
});
