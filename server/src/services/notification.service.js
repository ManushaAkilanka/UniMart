/**
 * Notification Service
 *
 * Central place for creating, persisting, and pushing notifications.
 * Every notification is:
 *   1. Saved to MongoDB (source of truth)
 *   2. Pushed live via Socket.IO to the recipient's user room
 *   3. Optionally emailed (only for report_resolved + listing_sold, configurable)
 *
 * Email digest is gated by ENV.NOTIFICATIONS_EMAIL_ENABLED (defaults to true).
 */
import { Notification } from '../models/index.js';
import { getIO } from './socket.service.js';
import { sendNotificationEmail } from './email.service.js';
import { ENV } from '../config/env.js';

const EMAIL_TYPES = new Set(['report_resolved', 'listing_sold']);

/**
 * Create and push a notification.
 *
 * @param {object} opts
 * @param {string}  opts.userId   – recipient ObjectId (string or ObjectId)
 * @param {string}  opts.type     – notification type enum
 * @param {string}  opts.title    – short headline
 * @param {string}  opts.body     – one-line description
 * @param {string}  [opts.linkTo] – client route
 * @param {string}  [opts.actorId]– user who triggered the event
 * @param {string}  [opts.email]  – recipient email for digest emails
 */
export const createNotification = async ({ userId, type, title, body, linkTo, actorId, email }) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      linkTo: linkTo || null,
      actorId: actorId || null,
    });

    // Push live to the recipient's socket room
    const io = getIO();
    if (io) {
      io.to(`user:${userId.toString()}`).emit('new_notification', notification);
    }

    // Digest email — only for high-value types and only if enabled
    if (
      EMAIL_TYPES.has(type) &&
      email &&
      ENV.NOTIFICATIONS_EMAIL_ENABLED !== false
    ) {
      sendNotificationEmail({ to: email, title, body, linkTo }).catch(() => {});
    }

    return notification;
  } catch (err) {
    // Non-fatal — never crash the main request for a notification failure
    console.error('[Notification] Failed to create notification:', err.message);
    return null;
  }
};

/**
 * Creates a "new message" notification only if the recipient does NOT currently
 * have the conversation room open in a socket session.
 *
 * "Actively viewing" = the recipient's socket is in the room `conversation:<id>`.
 *
 * @param {object} opts
 * @param {string} opts.conversationId
 * @param {string} opts.recipientId    – user who should receive the notification
 * @param {string} opts.recipientEmail
 * @param {string} opts.senderName
 * @param {string} opts.messagePreview – truncated first 60 chars of message body
 */
export const notifyNewMessage = async ({
  conversationId,
  recipientId,
  recipientEmail,
  senderName,
  messagePreview,
}) => {
  const io = getIO();

  // Check if recipient is actively viewing this conversation via socket
  if (io) {
    const roomName = `conversation:${conversationId.toString()}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    if (room) {
      // Check if any socket in this room belongs to the recipient
      for (const socketId of room) {
        const sock = io.sockets.sockets.get(socketId);
        if (sock?.user?._id?.toString() === recipientId.toString()) {
          // Recipient is actively in the conversation — skip the notification
          return null;
        }
      }
    }
  }

  const preview = messagePreview.length > 60
    ? messagePreview.substring(0, 57) + '…'
    : messagePreview;

  return createNotification({
    userId: recipientId,
    type: 'message',
    title: `New message from ${senderName}`,
    body: preview,
    linkTo: `/messages?conversation=${conversationId}`,
    email: null, // messages are never emailed
  });
};

/**
 * Notify the lister that someone claimed their free item.
 */
export const notifyClaim = async ({ listingId, listingTitle, ownerUserId, claimerName }) => {
  return createNotification({
    userId: ownerUserId,
    type: 'claim',
    title: 'Your free item was claimed!',
    body: `${claimerName} has claimed "${listingTitle}". Check your messages to arrange pickup.`,
    linkTo: `/listings/${listingId}`,
  });
};

/**
 * Notify all users who favorited a listing that it was marked sold.
 */
export const notifyListingSold = async ({ listingId, listingTitle, favoriters }) => {
  // favoriters: array of { userId, email }
  return Promise.all(
    favoriters.map(({ userId, email }) =>
      createNotification({
        userId,
        type: 'listing_sold',
        title: 'A saved listing has been sold',
        body: `"${listingTitle}" was marked as sold by the seller.`,
        linkTo: `/listings/${listingId}`,
        email,
      })
    )
  );
};

/**
 * Notify the reporter that their report has been resolved.
 */
export const notifyReportResolved = async ({ reporterUserId, reporterEmail, resolution }) => {
  return createNotification({
    userId: reporterUserId,
    type: 'report_resolved',
    title: 'Your report has been reviewed',
    body: resolution
      ? `Our team reviewed your report: "${resolution}"`
      : 'Our campus safety team has reviewed and resolved your report.',
    linkTo: '/profile',
    email: reporterEmail,
  });
};
