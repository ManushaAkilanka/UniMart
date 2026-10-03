/**
 * Socket.IO Security Tests
 *
 * Verifies:
 *  1. Unauthenticated sockets are rejected
 *  2. Authenticated sockets connect successfully
 *  3. A third user (non-participant) cannot join a conversation room
 *  4. A blocked user's new_message event is NOT delivered in real time
 *  5. A legitimate participant receives new_message in real time
 *  6. join_conversation re-verifies participant membership server-side
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import app from '../app.js';
import { initSocket } from '../services/socket.service.js';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { User, Category, Listing, Conversation, Message } from '../models/index.js';

vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────
const userAData = { fullName: 'Socket Seller', email: 'socket.seller@sci.cmb.ac.lk', password: 'Password123!' };
const userBData = { fullName: 'Socket Buyer',  email: 'socket.buyer@eng.pdn.ac.lk',  password: 'Password123!' };
const userCData = { fullName: 'Third Charlie',  email: 'charlie.socket@mrt.ac.lk',    password: 'Password123!' };

let httpServer;
let port;
let tokenA, tokenB, tokenC;
let userAId, userBId, userCId;
let conversationId;
let testListing;

// Helper: register and extract cookie + userId
async function registerUser(userData) {
  const res = await request(app).post('/api/auth/register').send(userData);
  expect(res.status).toBe(201);
  const token = res.headers['set-cookie'][0].split(';')[0].replace('token=', '');
  const userId = res.body.data.user._id;
  return { token, userId };
}

// Helper: create authenticated socket and wait for 'connect' or 'connect_error'
function connectSocket(token, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sock.disconnect();
      reject(new Error('Socket connection timed out'));
    }, timeout);

    const sock = ioClient(`http://localhost:${port}`, {
      extraHeaders: { cookie: `token=${token}` },
      transports: ['websocket'],
      forceNew: true,
    });

    sock.on('connect', () => { clearTimeout(timer); resolve(sock); });
    sock.on('connect_error', (err) => { clearTimeout(timer); sock.disconnect(); reject(err); });
  });
}

// Helper: join a room and await acknowledgement
function joinRoom(sock, conversationId, timeout = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ success: false, error: 'Timeout' }), timeout);
    sock.emit('join_conversation', { conversationId }, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

describe('Socket.IO Security', () => {
  beforeAll(async () => {
    await setupTestDB();

    // Start a real HTTP server for socket testing
    httpServer = createServer(app);
    initSocket(httpServer);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve) => httpServer.close(resolve));
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    const a = await registerUser(userAData);
    tokenA = a.token; userAId = a.userId;

    const b = await registerUser(userBData);
    tokenB = b.token; userBId = b.userId;

    const c = await registerUser(userCData);
    tokenC = c.token; userCId = c.userId;

    // Create listing owned by A (seller)
    const cat = await Category.create({ name: 'Electronics', slug: 'electronics', icon: 'devices' });
    testListing = await Listing.create({
      sellerId: userAId,
      title: 'Test Calculator',
      description: 'A test item for socket tests.',
      price: 1500,
      priceMode: 'fixed',
      currency: 'LKR',
      condition: 'used-good',
      listingType: 'sale',
      categoryId: cat._id,
      campus: 'CMB',
    });

    // Create conversation between A (seller) and B (buyer)
    const conv = await Conversation.create({
      listingId: testListing._id,
      buyerId: userBId,
      sellerId: userAId,
      participants: [userAId, userBId],
    });
    conversationId = conv._id.toString();
  });

  // ── 1. Unauthenticated connections are rejected ──────────────────────────────
  it('SECURITY: rejects unauthenticated socket connections', async () => {
    const err = await new Promise((resolve) => {
      const sock = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });
      sock.on('connect', () => { sock.disconnect(); resolve(null); });
      sock.on('connect_error', (e) => { sock.disconnect(); resolve(e); });
      setTimeout(() => { sock.disconnect(); resolve(new Error('timeout')); }, 4000);
    });
    expect(err).not.toBeNull();
    expect(err.message).toMatch(/authentication required|please log in/i);
  }, 10000);

  // ── 2. Authenticated sockets connect successfully ────────────────────────────
  it('SECURITY: allows authenticated users to connect via cookie', async () => {
    const sock = await connectSocket(tokenA);
    expect(sock.connected).toBe(true);
    sock.disconnect();
  }, 10000);

  // ── 3. Third user cannot join a conversation room ────────────────────────────
  it('SECURITY: third user (non-participant) cannot join a conversation room', async () => {
    const sockC = await connectSocket(tokenC);
    const res = await joinRoom(sockC, conversationId);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/access denied|not a participant/i);
    sockC.disconnect();
  }, 10000);

  // ── 4. Participant CAN join their own conversation room ───────────────────────
  it('SECURITY: participants can join their own conversation room', async () => {
    const sockA = await connectSocket(tokenA);
    const sockB = await connectSocket(tokenB);

    const resA = await joinRoom(sockA, conversationId);
    const resB = await joinRoom(sockB, conversationId);

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    sockA.disconnect();
    sockB.disconnect();
  }, 10000);

  // ── 5. new_message is delivered to both conversation participants in real time ─
  it('REALTIME: new_message event is delivered to conversation participants', async () => {
    const sockA = await connectSocket(tokenA);
    const sockB = await connectSocket(tokenB);

    await joinRoom(sockA, conversationId);
    await joinRoom(sockB, conversationId);

    // Seller (A) sends a message via REST — server emits new_message to room
    const received = new Promise((resolve) => {
      sockB.once('new_message', (payload) => resolve(payload));
      setTimeout(() => resolve(null), 5000);
    });

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', `token=${tokenA}`)
      .send({ body: 'Hello from seller!', messageType: 'text' });

    const payload = await received;
    expect(payload).not.toBeNull();
    expect(payload.conversationId).toBe(conversationId);
    expect(payload.message.body).toBe('Hello from seller!');

    sockA.disconnect();
    sockB.disconnect();
  }, 15000);

  // ── 6. Blocked user's messages are NOT delivered in real time ─────────────────
  it('SECURITY: blocked user messages are not delivered via socket', async () => {
    // Buyer (B) blocks Seller (A)
    await request(app)
      .post(`/api/users/${userAId}/block`)
      .set('Cookie', `token=${tokenB}`)
      .expect(200);

    const sockA = await connectSocket(tokenA);
    const sockB = await connectSocket(tokenB);

    await joinRoom(sockA, conversationId);
    await joinRoom(sockB, conversationId);

    const receivedByB = new Promise((resolve) => {
      sockB.once('new_message', () => resolve(true));
      setTimeout(() => resolve(false), 4000);
    });

    // Seller (A) attempts to send — REST accepts it (block checked here too, so it may 400)
    // but even if the message were stored, socket delivery should be suppressed
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', `token=${tokenA}`)
      .send({ body: 'Blocked message attempt', messageType: 'text' });

    const wasDelivered = await receivedByB;
    // Because B has blocked A, the socket service's emitNewMessage should not deliver
    expect(wasDelivered).toBe(false);

    sockA.disconnect();
    sockB.disconnect();
  }, 15000);

  // ── 7. Third user does not receive messages even if already listening ──────────
  it('SECURITY: third user cannot receive messages for conversations they are not part of', async () => {
    const sockC = await connectSocket(tokenC);
    const sockA = await connectSocket(tokenA);
    const sockB = await connectSocket(tokenB);

    // C tries to join — will be denied — but also just listens on new_message globally
    const eavesdropAttempt = await joinRoom(sockC, conversationId);
    expect(eavesdropAttempt.success).toBe(false);

    const messagesReceivedByC = [];
    sockC.on('new_message', (p) => messagesReceivedByC.push(p));

    await joinRoom(sockA, conversationId);
    await joinRoom(sockB, conversationId);

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', `token=${tokenA}`)
      .send({ body: 'Private message', messageType: 'text' });

    // Wait briefly then verify C received nothing
    await new Promise((r) => setTimeout(r, 2000));
    expect(messagesReceivedByC.length).toBe(0);

    sockC.disconnect();
    sockA.disconnect();
    sockB.disconnect();
  }, 15000);
});
