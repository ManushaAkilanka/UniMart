import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Conversation, Message, User } from '../models/index.js';
import { ENV } from '../config/env.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

let io = null;

/**
 * Robust cookie parser helper for socket handshake headers
 */
export const parseCookies = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const cookies = {};
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    if (!key) return;
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  });
  return cookies;
};

/**
 * Socket.IO handshake authentication middleware.
 * Verifies JWT from HTTP-only cookie, auth object, or Authorization header.
 * Rejects unauthenticated connections and suspended accounts.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = null;

    // 1. Try HTTP-only cookie from handshake
    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      if (cookies.token) {
        token = cookies.token;
      }
    }

    // 2. Fall back to socket handshake auth object
    if (!token && socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }

    // 3. Fall back to Authorization header
    if (!token && socket.handshake.headers?.authorization?.startsWith('Bearer ')) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication required. Please log in.'));
    }

    let payload;
    try {
      payload = jwt.verify(token, ENV.JWT_SECRET);
    } catch (jwtErr) {
      const msg =
        jwtErr.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return next(new Error(msg));
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return next(new Error('User no longer exists.'));
    }

    if (user.isSuspended) {
      return next(new Error('Account suspended. Contact support.'));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed: ' + err.message));
  }
};

/**
 * Initialize Socket.IO with HTTP server
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: ENV.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Join user's individual room for direct notifications (e.g. unread counts)
    socket.join(`user:${userId}`);

    // Join active conversation room: server verifies participant access before joining
    socket.on('join_conversation', async ({ conversationId }, callback) => {
      try {
        if (!conversationId || !OBJECT_ID_REGEX.test(conversationId)) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Invalid conversation ID.' });
          }
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Conversation not found.' });
          }
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );

        if (!isParticipant) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Access denied. You are not a participant in this conversation.',
            });
          }
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (typeof callback === 'function') {
          callback({ success: true, conversationId });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId && OBJECT_ID_REGEX.test(conversationId)) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Client-triggered send message over socket (re-verifies conversation membership & blocks)
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, body, messageType = 'text', proposalDetails } = data || {};
        if (!conversationId || !OBJECT_ID_REGEX.test(conversationId)) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Invalid conversation ID.' });
          }
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Conversation not found.' });
          }
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Access denied. You are not a participant in this conversation.',
            });
          }
          return;
        }

        // Check blocked status
        const otherParticipantId = conversation.participants.find(
          (p) => p.toString() !== userId
        );
        if (otherParticipantId) {
          const [currentUser, otherUser] = await Promise.all([
            User.findById(userId),
            User.findById(otherParticipantId),
          ]);
          if (currentUser?.blockedUsers?.some((b) => b.toString() === otherParticipantId.toString())) {
            if (typeof callback === 'function') {
              callback({ success: false, error: 'You have blocked this user.' });
            }
            return;
          }
          if (otherUser?.blockedUsers?.some((b) => b.toString() === userId)) {
            if (typeof callback === 'function') {
              callback({ success: false, error: 'Cannot send messages to this user.' });
            }
            return;
          }
        }

        // Validate body
        if (!body || typeof body !== 'string' || !body.trim()) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Message body is required.' });
          }
          return;
        }

        const trimmedBody = body.trim();
        if (trimmedBody.length > 1000) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Message cannot exceed 1000 characters.' });
          }
          return;
        }

        let cleanProposalDetails = undefined;
        if (messageType === 'meetup_proposal') {
          if (!proposalDetails || !proposalDetails.location || !proposalDetails.meetupTime) {
            if (typeof callback === 'function') {
              callback({ success: false, error: 'Meetup proposals require location and meetupTime.' });
            }
            return;
          }
          cleanProposalDetails = {
            location: String(proposalDetails.location).trim(),
            locationNotes: proposalDetails.locationNotes ? String(proposalDetails.locationNotes).trim() : null,
            meetupTime: String(proposalDetails.meetupTime).trim(),
            timeNotes: proposalDetails.timeNotes ? String(proposalDetails.timeNotes).trim() : null,
            amount: proposalDetails.amount != null ? Number(proposalDetails.amount) : null,
            status: 'proposed',
          };
        }

        const message = await Message.create({
          conversationId: conversation._id,
          senderId: userId,
          body: trimmedBody,
          messageType: ['text', 'image', 'system', 'meetup_proposal'].includes(messageType)
            ? messageType
            : 'text',
          proposalDetails: cleanProposalDetails,
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        await message.populate('senderId', 'fullName email faculty campus avatarUrl isVerified');

        await emitNewMessage(conversation._id, message);
        if (otherParticipantId) {
          await updateAndEmitUnreadCount(otherParticipantId);
        }

        if (typeof callback === 'function') {
          callback({ success: true, message });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on('disconnect', () => {
      // Socket.IO automatically leaves rooms on disconnect
    });
  });

  return io;
};

/**
 * Returns current io instance
 */
export const getIO = () => io;

/**
 * Emits a newly created message to the conversation room.
 * Re-verifies participants and block status before emitting.
 */
export const emitNewMessage = async (conversationId, message) => {
  if (!io) return;

  const conversation = await Conversation.findById(conversationId).populate('participants');
  if (!conversation) return;

  const senderId = (message.senderId?._id || message.senderId).toString();
  const otherParticipant = conversation.participants.find(
    (p) => p._id.toString() !== senderId
  );
  const sender = conversation.participants.find(
    (p) => p._id.toString() === senderId
  );

  // If either user has blocked the other, do NOT deliver in real time
  if (sender && otherParticipant) {
    const isSenderBlocked = otherParticipant.blockedUsers?.some(
      (id) => id.toString() === senderId
    );
    const hasSenderBlocked = sender.blockedUsers?.some(
      (id) => id.toString() === otherParticipant._id.toString()
    );
    if (isSenderBlocked || hasSenderBlocked) {
      return;
    }
  }

  const convIdStr = conversationId.toString();
  io.to(`conversation:${convIdStr}`).emit('new_message', {
    conversationId: convIdStr,
    message,
  });
};

/**
 * Re-calculates and emits updated unread count to a specific user
 */
export const updateAndEmitUnreadCount = async (userId) => {
  if (!io) return 0;
  try {
    const userConvs = await Conversation.find({ participants: userId }).select('_id').lean();
    const convIds = userConvs.map((c) => c._id);

    const count = await Message.countDocuments({
      conversationId: { $in: convIds },
      senderId: { $ne: userId },
      isRead: false,
    });

    io.to(`user:${userId.toString()}`).emit('unread_count_change', { count });
    return count;
  } catch (err) {
    console.error('[Socket] Failed to calculate and emit unread count:', err);
    return 0;
  }
};

/**
 * Emits meetup proposal status change (accepted/declined) to the conversation room
 */
export const emitProposalStatusChange = (conversationId, data) => {
  if (!io) return;
  const convIdStr = conversationId.toString();
  io.to(`conversation:${convIdStr}`).emit('meetup_status_change', {
    conversationId: convIdStr,
    ...data,
  });
};

/**
 * Emits read receipts to the conversation room
 */
export const emitMessagesRead = (conversationId, readBy) => {
  if (!io) return;
  const convIdStr = conversationId.toString();
  io.to(`conversation:${convIdStr}`).emit('messages_read', {
    conversationId: convIdStr,
    readBy: readBy.toString(),
  });
};
