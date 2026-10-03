/**
 * Conversation & Messaging API Integration Tests
 *
 * Requirements:
 *  - GET/POST /api/conversations (one per buyer+listing)
 *  - GET/POST /api/conversations/:id/messages
 *  - Only the two participants can access (third user gets 403)
 *  - Max 1000 characters
 *  - Rate limited
 *  - Suspended users blocked
 *  - A user cannot message themselves
 *  - Unread counts
 *  - Text stored raw and escaped on render
 *  - Campus Meetup Proposal message type
 *  - Block and Report options
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { User, Category, Listing, Conversation, Message } from '../models/index.js';

// Mock the email service
vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
}));

// Test Fixtures
const userAData = {
  fullName: 'Seller Kaveen',
  email: 'kaveen@sci.cmb.ac.lk',
  password: 'Password123!',
};

const userBData = {
  fullName: 'Buyer Dinithi',
  email: 'dinithi@eng.pdn.ac.lk',
  password: 'Password123!',
};

const userCData = {
  fullName: 'Third User Charlie',
  email: 'charlie@mrt.ac.lk',
  password: 'Password123!',
};

let tokenA = '';
let tokenB = '';
let tokenC = '';
let userAId = '';
let userBId = '';
let userCId = '';
let testCategory = null;
let testListing = null;

async function registerAndGetToken(userData) {
  const res = await request(app).post('/api/auth/register').send(userData);
  expect(res.status).toBe(201);
  const token = res.headers['set-cookie'][0].split(';')[0].replace('token=', '');
  const userId = res.body.data.user._id;
  return { token, userId };
}

describe('UniMart Conversations & Messaging API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Register 3 users
    const a = await registerAndGetToken(userAData);
    tokenA = a.token;
    userAId = a.userId;

    const b = await registerAndGetToken(userBData);
    tokenB = b.token;
    userBId = b.userId;

    const c = await registerAndGetToken(userCData);
    tokenC = c.token;
    userCId = c.userId;

    // Create category
    testCategory = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      icon: 'devices',
    });

    // Create listing owned by Seller A
    testListing = await Listing.create({
      sellerId: userAId,
      title: 'Casio fx-991EX ClassWiz',
      description: 'Used scientific calculator in great condition with cover.',
      categoryId: testCategory._id,
      listingType: 'sale',
      price: 6500,
      priceMode: 'negotiable',
      condition: 'like-new',
      campus: 'University of Colombo',
      status: 'active',
      images: [{ url: 'https://example.com/casio.jpg', publicId: 'casio_1' }],
    });
  });

  // ── Conversation Creation & Listing ─────────────────────────────────────────
  describe('POST /api/conversations (one per buyer+listing)', () => {
    it('creates a new conversation between buyer and seller', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenB}`])
        .send({ listingId: testListing._id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.isNew).toBe(true);
      expect(res.body.conversation.listingId._id.toString()).toBe(testListing._id.toString());
      expect(res.body.conversation.buyerId._id.toString()).toBe(userBId.toString());
      expect(res.body.conversation.sellerId._id.toString()).toBe(userAId.toString());
    });

    it('returns the existing conversation if called again (one per buyer+listing)', async () => {
      // First call
      const res1 = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenB}`])
        .send({ listingId: testListing._id });
      expect(res1.status).toBe(201);

      // Second call
      const res2 = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenB}`])
        .send({ listingId: testListing._id });
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.isNew).toBe(false);
      expect(res2.body.conversation._id.toString()).toBe(res1.body.conversation._id.toString());
    });

    it('blocks a user from messaging themselves on their own listing (400)', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenA}`]) // Seller A tries to message themselves
        .send({ listingId: testListing._id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot message yourself/i);
    });

    it('blocks suspended users from accessing conversations (403)', async () => {
      await User.findByIdAndUpdate(userBId, { isSuspended: true, suspendedReason: 'Spam violation' });

      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenB}`])
        .send({ listingId: testListing._id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/suspended/i);
    });
  });

  // ── Access Control & Messages ───────────────────────────────────────────────
  describe('GET & POST /api/conversations/:id/messages', () => {
    let convId = '';

    beforeEach(async () => {
      // Create conversation between Buyer B and Seller A
      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenB}`])
        .send({ listingId: testListing._id });
      convId = res.body.conversation._id;
    });

    it('allows participants (buyer and seller) to send and receive messages', async () => {
      // Buyer B sends message
      const postB = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ body: 'Hi Kaveen! Is the calculator still available?' });

      expect(postB.status).toBe(201);
      expect(postB.body.success).toBe(true);
      expect(postB.body.message.body).toBe('Hi Kaveen! Is the calculator still available?');

      // Seller A sends reply
      const postA = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ body: 'Yes Dinithi, available!' });

      expect(postA.status).toBe(201);
      expect(postA.body.success).toBe(true);

      // Buyer B fetches messages
      const getB = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(getB.status).toBe(200);
      expect(getB.body.messages).toHaveLength(2);
    });

    it('CRITICAL: returns 403 Forbidden when a third user attempts to GET messages', async () => {
      // User C (neither Buyer nor Seller) attempts to read messages
      const res = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenC}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/access denied/i);
    });

    it('CRITICAL: returns 403 Forbidden when a third user attempts to POST a message', async () => {
      // User C attempts to inject a message
      const res = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenC}`])
        .send({ body: 'I want to intercept this chat!' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/access denied/i);
    });

    it('enforces max 1000 characters on messages (400 if exceeded)', async () => {
      const longMessage = 'A'.repeat(1001);
      const res = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ body: longMessage });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot exceed 1000 characters/i);
    });

    it('stores text raw in the database (escaped on render in UI)', async () => {
      const xssPayload = '<script>alert("xss")</script> <b>bold</b>';
      const res = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ body: xssPayload });

      expect(res.status).toBe(201);
      expect(res.body.message.body).toBe(xssPayload);

      // Verify directly from DB
      const dbMsg = await Message.findById(res.body.message._id);
      expect(dbMsg.body).toBe(xssPayload);
    });

    it('supports Campus Meetup Proposal message type and status update', async () => {
      const proposalPayload = {
        body: 'Proposed meetup at Science Library Foyer',
        messageType: 'meetup_proposal',
        proposalDetails: {
          location: 'Faculty of Science Library Foyer',
          locationNotes: 'Public daylight area near security desk',
          meetupTime: 'Today at 1:30 PM',
          timeNotes: 'After Physics Practical',
          amount: 6000,
        },
      };

      const res = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send(proposalPayload);

      expect(res.status).toBe(201);
      expect(res.body.message.messageType).toBe('meetup_proposal');
      expect(res.body.message.proposalDetails.location).toBe('Faculty of Science Library Foyer');
      expect(res.body.message.proposalDetails.status).toBe('proposed');

      const messageId = res.body.message._id;

      // Seller A accepts proposal
      const acceptRes = await request(app)
        .patch(`/api/conversations/${convId}/messages/${messageId}/proposal`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ status: 'accepted' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.message.proposalDetails.status).toBe('accepted');
    });

    it('tracks unread counts and marks messages as read on fetch', async () => {
      // Buyer sends 2 messages to Seller
      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ body: 'Message 1' });

      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ body: 'Message 2' });

      // Seller checks conversation list -> unreadCount should be 2
      const convListRes = await request(app)
        .get('/api/conversations')
        .set('Cookie', [`token=${tokenA}`]);

      expect(convListRes.status).toBe(200);
      const sellerConv = convListRes.body.conversations.find((c) => c._id.toString() === convId);
      expect(sellerConv.unreadCount).toBe(2);

      // Unread count endpoint
      const unreadCountRes = await request(app)
        .get('/api/conversations/unread-count')
        .set('Cookie', [`token=${tokenA}`]);
      expect(unreadCountRes.body.count).toBe(2);

      // Seller fetches messages -> unread messages are marked as read
      await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenA}`]);

      // Now unread count for Seller should be 0
      const unreadAfter = await request(app)
        .get('/api/conversations/unread-count')
        .set('Cookie', [`token=${tokenA}`]);
      expect(unreadAfter.body.count).toBe(0);
    });
  });

  // ── Block & Report Feature ──────────────────────────────────────────────────
  describe('Block and Report Options', () => {
    let convId = '';

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [`token=${tokenB}`])
        .send({ listingId: testListing._id });
      convId = res.body.conversation._id;
    });

    it('allows blocking a user and blocks messages between them', async () => {
      // User A blocks User B
      const blockRes = await request(app)
        .post(`/api/users/${userBId}/block`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(blockRes.status).toBe(200);
      expect(blockRes.body.success).toBe(true);

      // User A tries to send message to blocked User B -> 400
      const postFromA = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ body: 'Hello blocked user' });
      expect(postFromA.status).toBe(400);
      expect(postFromA.body.message).toMatch(/blocked/i);

      // User B tries to send message to User A who blocked them -> 400
      const postFromB = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ body: 'Can you hear me?' });
      expect(postFromB.status).toBe(400);

      // User A unblocks User B
      const unblockRes = await request(app)
        .post(`/api/users/${userBId}/unblock`)
        .set('Cookie', [`token=${tokenA}`]);
      expect(unblockRes.status).toBe(200);

      // User A can now send message again
      const postAgain = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ body: 'Unblocked now!' });
      expect(postAgain.status).toBe(201);
    });

    it('allows submitting a safety report', async () => {
      const reportRes = await request(app)
        .post('/api/reports')
        .set('Cookie', [`token=${tokenB}`])
        .send({
          targetType: 'user',
          targetId: userAId,
          reason: 'harassment',
          details: 'User was rude during negotiations.',
        });

      expect(reportRes.status).toBe(201);
      expect(reportRes.body.success).toBe(true);
      expect(reportRes.body.report.reason).toBe('harassment');
    });
  });
});
