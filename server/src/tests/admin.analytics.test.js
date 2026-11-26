import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { Category, Conversation, Favorite, Listing, User } from '../models/index.js';
import { signToken } from '../services/auth.service.js';

const route = '/api/admin/analytics';

describe('Admin analytics API', () => {
  let adminToken;
  let moderatorToken;
  let studentToken;
  let sellerId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();
    const [admin, moderator, seller, buyer] = await User.create([
      {
        fullName: 'Analytics Admin',
        email: 'analytics.admin@sci.cmb.ac.lk',
        googleId: 'analytics-admin',
        role: 'admin',
        isVerified: true,
        campus: 'University of Colombo',
        faculty: 'Administration',
        studentId: 'PRIVATE-ADMIN-1',
      },
      {
        fullName: 'Analytics Moderator',
        email: 'analytics.moderator@sci.cmb.ac.lk',
        googleId: 'analytics-moderator',
        role: 'moderator',
        isVerified: true,
        campus: 'University of Colombo',
        faculty: 'Administration',
      },
      {
        fullName: 'Alice Seller',
        email: 'alice.seller@sci.cmb.ac.lk',
        googleId: 'analytics-seller',
        isVerified: true,
        campus: 'University of Colombo',
        faculty: 'Science',
        studentId: 'PRIVATE-SELLER-1',
      },
      {
        fullName: 'Pending Buyer',
        email: 'pending.buyer@sci.cmb.ac.lk',
        googleId: 'analytics-buyer',
        accountStatus: 'pending_approval',
        campus: 'University of Colombo',
        faculty: 'Engineering',
      },
    ]);
    sellerId = seller._id;
    adminToken = signToken(admin._id);
    moderatorToken = signToken(moderator._id);
    studentToken = signToken(buyer._id);

    const category = await Category.create({ name: 'Books', slug: 'books' });
    const listings = await Listing.create([
      {
        sellerId: seller._id,
        title: 'Sold book',
        description: 'A sold academic book in good condition.',
        categoryId: category._id,
        listingType: 'sale',
        price: 100,
        condition: 'used-good',
        campus: 'University of Colombo',
        status: 'sold',
        viewCount: 5,
      },
      {
        sellerId: seller._id,
        title: 'Active book',
        description: 'An active academic book in good condition.',
        categoryId: category._id,
        listingType: 'sale',
        price: 200,
        condition: 'used-good',
        campus: 'University of Colombo',
        status: 'active',
        viewCount: 7,
      },
      {
        sellerId: seller._id,
        title: 'Claimed free book',
        description: 'A free academic book already claimed.',
        categoryId: category._id,
        listingType: 'free',
        campus: 'University of Colombo',
        status: 'claimed',
      },
      {
        sellerId: buyer._id,
        title: 'Wanted reference book',
        description: 'A fulfilled request for a reference book.',
        categoryId: category._id,
        listingType: 'wanted',
        campus: 'University of Colombo',
        status: 'fulfilled',
      },
    ]);
    await Favorite.create({ userId: buyer._id, listingId: listings[1]._id });
    await Conversation.create({
      listingId: listings[1]._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      participants: [buyer._id, seller._id],
    });
  });

  it('requires an authenticated admin, excluding moderators and ordinary users', async () => {
    const unauthenticated = await request(app).get(`${route}/overview`);
    const moderator = await request(app)
      .get(`${route}/overview`)
      .set('Authorization', `Bearer ${moderatorToken}`);
    const student = await request(app)
      .get(`${route}/overview`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(unauthenticated.status).toBe(401);
    expect(moderator.status).toBe(403);
    expect(student.status).toBe(403);
  });

  it('validates range and whitelists analytics query parameters', async () => {
    const invalidRange = await request(app)
      .get(`${route}/overview?range=365d`)
      .set('Authorization', `Bearer ${adminToken}`);
    const oversizedLimit = await request(app)
      .get(`${route}/overview?limit=26`)
      .set('Authorization', `Bearer ${adminToken}`);
    const unknownParam = await request(app)
      .get(`${route}/overview?studentId=private`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invalidRange.status).toBe(400);
    expect(oversizedLimit.status).toBe(400);
    expect(unknownParam.status).toBe(400);
  });

  it('computes overview counts and seller analytics from the fixture', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const overview = await request(app).get(`${route}/overview?range=30d`).set(auth);
    const listers = await request(app).get(`${route}/top-listers?range=30d`).set(auth);
    const sellers = await request(app).get(`${route}/top-sellers?range=30d`).set(auth);
    const engagement = await request(app).get(`${route}/engagement?range=30d`).set(auth);
    const categories = await request(app).get(`${route}/categories?range=30d`).set(auth);
    const locations = await request(app).get(`${route}/campuses-faculties?range=30d`).set(auth);
    const trends = await request(app).get(`${route}/trends?range=30d`).set(auth);

    expect(overview.status).toBe(200);
    expect(overview.body.overview).toEqual({
      totalUsers: 4,
      newUsersInRange: 4,
      activeListings: 1,
      soldListings: 1,
      estimatedValueSold: 100,
      freeItemsClaimed: 1,
      wantedRequestsFulfilled: 1,
      conversationsStarted: 1,
      pendingAccounts: 1,
    });
    expect(listers.body.sellers[0]).toMatchObject({
      created: 3,
      active: 1,
      sold: 1,
      seller: { name: 'Alice Seller', faculty: 'Science', campus: 'University of Colombo' },
    });
    expect(sellers.body.sellers[0]).toMatchObject({
      sold: 1,
      estimatedValueSold: 100,
      seller: { email: 'a***@sci.cmb.ac.lk' },
    });
    expect(sellers.body.sellers[0].sellThroughRate).toBeCloseTo(1 / 3);
    expect(engagement.body.sellers[0]).toMatchObject({
      views: 12,
      favoritesReceived: 1,
      conversationsReceived: 1,
    });
    expect(categories.body.categories[0]).toMatchObject({
      name: 'Books',
      listings: 4,
      sold: 1,
      averagePrice: 150,
      listingTypeMix: { sale: 2, free: 1, wanted: 1 },
    });
    expect(locations.body.campuses[0]).toMatchObject({
      name: 'University of Colombo',
      users: 4,
      listings: 4,
    });
    expect(trends.body.trends).toHaveLength(1);
    expect(trends.body.trends[0]).toMatchObject({ created: 4, sold: 1 });
    expect(sellers.body.bestSellerFormula).toContain('sold × 10');

    for (const response of [
      overview,
      listers,
      sellers,
      engagement,
      categories,
      locations,
      trends,
    ]) {
      const body = JSON.stringify(response.body);
      for (const privateField of [
        'studentId',
        'passwordHash',
        'googleId',
        'emailVerificationCode',
        'passwordResetToken',
        'PRIVATE-',
      ]) {
        expect(body).not.toContain(privateField);
      }
    }
    expect(String(sellerId)).toBeTruthy();
  });
});
