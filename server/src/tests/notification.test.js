/**
 * Notification System Tests
 *
 * Verifies:
 *  1. A user actively viewing a conversation does NOT get a duplicate
 *     "new message" notification for messages in that conversation
 *  2. Marking one notification read doesn't affect others
 *  3. The /read-all endpoint marks all unread notifications as read
 *  4. GET /notifications returns paginated results with correct unreadCount
 *  5. User cannot mark another user's notification as read (ownership)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import app from '../app.js';
import { initSocket } from '../services/socket.service.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { User, Category, Listing, Conversation, Notification } from '../models/index.js';

vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
  sendNotificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-notif-456' }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sellerData = { fullName: 'Notif Seller', email: 'notif.seller@sci.cmb.ac.lk', password: 'Password123!' };
const buyerData  = { fullName: 'Notif Buyer',  email: 'notif.buyer@eng.pdn.ac.lk',  password: 'Password123!' };

let httpServer, port;
let tokenSeller, tokenBuyer;
let userSellerId, userBuyerId;
let conversationId;

async function registerUser(data) {
  const res = await request(app).post('/api/auth/register').send(data);
  expect(res.status).toBe(201);
  const token = res.headers['set-cookie'][0].split(';')[0].replace('token=', '');
  return { token, userId: res.body.data.user._id };
}

function connectSocket(token, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { sock.disconnect(); reject(new Error('Timeout')); }, timeout);
    const sock = ioClient(`http://localhost:${port}`, {
      extraHeaders: { cookie: `token=${token}` },
      transports: ['websocket'],
      forceNew: true,
    });
    sock.on('connect', () => { clearTimeout(timer); resolve(sock); });
    sock.on('connect_error', (e) => { clearTimeout(timer); sock.disconnect(); reject(e); });
  });
}

function joinRoom(sock, conversationId, timeout = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ success: false }), timeout);
    sock.emit('join_conversation', { conversationId }, (res) => {
      clearTimeout(timer); resolve(res);
    });
  });
}

describe('Notification System', () => {
  beforeAll(async () => {
    await setupTestDB();
    httpServer = createServer(app);
    initSocket(httpServer);
    await new Promise((r) => httpServer.listen(0, r));
    port = httpServer.address().port;
  });

  afterAll(async () => {
    await new Promise((r) => httpServer.close(r));
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    const s = await registerUser(sellerData);
    tokenSeller = s.token; userSellerId = s.userId;

    const b = await registerUser(buyerData);
    tokenBuyer = b.token; userBuyerId = b.userId;

    const cat = await Category.create({ name: 'Electronics', slug: 'electronics', icon: 'devices' });
    const listing = await Listing.create({
      sellerId: userSellerId,
      title: 'Notif Test Listing',
      description: 'A test listing for notification tests.',
      price: 1000,
      priceMode: 'fixed',
      currency: 'LKR',
      condition: 'new',
      listingType: 'sale',
      categoryId: cat._id,
      campus: 'CMB',
    });

    const conv = await Conversation.create({
      listingId: listing._id,
      buyerId: userBuyerId,
      sellerId: userSellerId,
      participants: [userBuyerId, userSellerId],
    });
    conversationId = conv._id.toString();
  });

  // ── 1. Actively viewing user does NOT get a new_message notification ────────
  it('NOTIFICATION: no duplicate notification when recipient is actively viewing the conversation', async () => {
    const sockSeller = await connectSocket(tokenSeller);
    const sockBuyer  = await connectSocket(tokenBuyer);

    // Buyer is ACTIVELY viewing the conversation (joined the socket room)
    await joinRoom(sockBuyer, conversationId);
    await joinRoom(sockSeller, conversationId);

    // Seller sends a message via REST
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', `token=${tokenSeller}`)
      .send({ body: 'Hey, are you there?', messageType: 'text' });

    expect(res.status).toBe(201);

    // Wait for async notification creation to settle
    await new Promise((r) => setTimeout(r, 1500));

    // Buyer was in the room — should have NO notification created
    const notifs = await Notification.find({ userId: userBuyerId });
    expect(notifs.length).toBe(0);

    sockSeller.disconnect();
    sockBuyer.disconnect();
  }, 15000);

  // ── 2. Notification IS created when recipient is NOT in the conversation ─────
  it('NOTIFICATION: notification created when recipient is not viewing the conversation', async () => {
    // Seller sends a message — buyer has no socket connection (offline)
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', `token=${tokenSeller}`)
      .send({ body: 'Hello!', messageType: 'text' });

    expect(res.status).toBe(201);

    // Allow async notification to settle
    await new Promise((r) => setTimeout(r, 1500));

    const notifs = await Notification.find({ userId: userBuyerId, type: 'message' });
    expect(notifs.length).toBe(1);
    expect(notifs[0].isRead).toBe(false);
  }, 10000);

  // ── 3. Marking one notification read doesn't affect others ──────────────────
  it('NOTIFICATION: marking one notification read does not mark others read', async () => {
    // Create two notifications for the buyer
    await Notification.create([
      { userId: userBuyerId, type: 'message',   title: 'Msg 1', body: 'First',  linkTo: '/messages', isRead: false },
      { userId: userBuyerId, type: 'listing_sold', title: 'Sold', body: 'Second', linkTo: '/listings/abc', isRead: false },
    ]);

    const { notifications: initial } = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${tokenBuyer}`)
      .then((r) => r.body);

    expect(initial).toHaveLength(2);
    const [first, second] = initial;

    // Mark only the first one read
    const markRes = await request(app)
      .patch(`/api/notifications/${first._id}/read`)
      .set('Cookie', `token=${tokenBuyer}`);

    expect(markRes.status).toBe(200);
    expect(markRes.body.notification.isRead).toBe(true);

    // Fetch again — second should still be unread
    const { notifications: after, unreadCount } = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${tokenBuyer}`)
      .then((r) => r.body);

    const secondAfter = after.find((n) => n._id === second._id);
    expect(secondAfter.isRead).toBe(false);
    expect(unreadCount).toBe(1);
  });

  // ── 4. GET /api/notifications returns correct unreadCount ───────────────────
  it('NOTIFICATION: GET /api/notifications returns unreadCount and pagination', async () => {
    await Notification.create([
      { userId: userBuyerId, type: 'message',   title: 'A', body: 'B', isRead: false },
      { userId: userBuyerId, type: 'claim',     title: 'C', body: 'D', isRead: true  },
      { userId: userBuyerId, type: 'listing_sold', title: 'E', body: 'F', isRead: false },
    ]);

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${tokenBuyer}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(3);
    expect(res.body.unreadCount).toBe(2);
    expect(res.body.pagination.total).toBe(3);
  });

  // ── 5. PATCH /read-all marks all notifications read ─────────────────────────
  it('NOTIFICATION: mark-all-read sets all notifications isRead=true', async () => {
    await Notification.create([
      { userId: userBuyerId, type: 'message', title: 'X', body: 'Y', isRead: false },
      { userId: userBuyerId, type: 'message', title: 'A', body: 'B', isRead: false },
    ]);

    const markAll = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', `token=${tokenBuyer}`);

    expect(markAll.status).toBe(200);

    const { unreadCount } = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${tokenBuyer}`)
      .then((r) => r.body);

    expect(unreadCount).toBe(0);
  });

  // ── 6. User cannot mark another user's notification as read ─────────────────
  it('SECURITY: user cannot mark another user\'s notification read', async () => {
    const notif = await Notification.create({
      userId: userSellerId,   // belongs to seller
      type: 'message',
      title: 'Private',
      body: 'For seller only',
      isRead: false,
    });

    // Buyer tries to mark seller's notification as read
    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Cookie', `token=${tokenBuyer}`);

    // Should 404 because the query filters by userId: req.user._id
    expect(res.status).toBe(404);

    // Seller's notification should still be unread
    const unchanged = await Notification.findById(notif._id);
    expect(unchanged.isRead).toBe(false);
  });
});
