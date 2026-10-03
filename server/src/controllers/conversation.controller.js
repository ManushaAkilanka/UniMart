/**
 * Conversation & Message Controller
 *
 * GET   /api/conversations                     – List conversations for authenticated user
 * GET   /api/conversations/unread-count        – Get total unread count across all conversations
 * POST  /api/conversations                     – Create or get existing conversation for (buyer + listing)
 * GET   /api/conversations/:id/messages        – Get all messages in conversation (marks as read)
 * POST  /api/conversations/:id/messages        – Send a message in conversation
 * PATCH /api/conversations/:id/messages/:messageId/proposal – Accept/decline a meetup proposal
 */
import mongoose from 'mongoose';
import { Conversation, Message, Listing, User } from '../models/index.js';
import {
  emitNewMessage,
  updateAndEmitUnreadCount,
  emitProposalStatusChange,
  emitMessagesRead,
} from '../services/socket.service.js';
import { notifyNewMessage } from '../services/notification.service.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// ── GET /api/conversations ────────────────────────────────────────────────────
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all conversations where the user is a participant
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({
        path: 'listingId',
        select: 'title price priceMode currency images status campus meetupSpots sellerId',
      })
      .populate({
        path: 'buyerId',
        select: 'fullName email faculty campus avatarUrl isVerified',
      })
      .populate({
        path: 'sellerId',
        select: 'fullName email faculty campus avatarUrl isVerified',
      })
      .populate({
        path: 'participants',
        select: 'fullName email faculty campus avatarUrl isVerified isSuspended',
      })
      .populate({
        path: 'lastMessage',
        select: 'body messageType createdAt senderId isRead proposalDetails',
      })
      .lean();

    // Attach unread counts for each conversation
    const convIds = conversations.map((c) => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convIds },
          senderId: { $ne: userId },
          isRead: false,
        },
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = new Map();
    unreadAgg.forEach((item) => {
      unreadMap.set(item._id.toString(), item.count);
    });

    const enriched = conversations.map((conv) => ({
      ...conv,
      unreadCount: unreadMap.get(conv._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      conversations: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/conversations/unread-count ────────────────────────────────────────
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const userConvs = await Conversation.find({ participants: userId }).select('_id').lean();
    const convIds = userConvs.map((c) => c._id);

    const count = await Message.countDocuments({
      conversationId: { $in: convIds },
      senderId: { $ne: userId },
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/conversations ───────────────────────────────────────────────────
export const createOrGetConversation = async (req, res, next) => {
  try {
    const buyerId = req.user._id;
    const { listingId } = req.body;

    if (!listingId || !OBJECT_ID_REGEX.test(listingId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid listingId is required.',
      });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    const sellerId = listing.sellerId;

    // Rule: a user cannot message themselves
    if (sellerId.toString() === buyerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot message yourself about your own listing.',
      });
    }

    // Check seller suspension
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found.',
      });
    }
    if (seller.isSuspended) {
      return res.status(400).json({
        success: false,
        message: 'This seller account is suspended.',
      });
    }

    // Check blocks
    if (req.user.blockedUsers?.some((id) => id.toString() === sellerId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You have blocked this seller. Unblock them to start a conversation.',
      });
    }
    if (seller.blockedUsers?.some((id) => id.toString() === buyerId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'This seller is not accepting messages from you.',
      });
    }

    // One per buyer + listing: check if conversation already exists
    let conversation = await Conversation.findOne({
      buyerId,
      listingId: listing._id,
    })
      .populate({
        path: 'listingId',
        select: 'title price priceMode currency images status campus meetupSpots sellerId',
      })
      .populate({
        path: 'buyerId',
        select: 'fullName email faculty campus avatarUrl isVerified',
      })
      .populate({
        path: 'sellerId',
        select: 'fullName email faculty campus avatarUrl isVerified',
      })
      .populate({
        path: 'participants',
        select: 'fullName email faculty campus avatarUrl isVerified isSuspended',
      });

    if (conversation) {
      return res.status(200).json({
        success: true,
        conversation,
        isNew: false,
      });
    }

    // Create new conversation
    conversation = await Conversation.create({
      listingId: listing._id,
      buyerId,
      sellerId,
      participants: [buyerId, sellerId],
    });

    // Populate for response
    await conversation.populate([
      {
        path: 'listingId',
        select: 'title price priceMode currency images status campus meetupSpots sellerId',
      },
      {
        path: 'buyerId',
        select: 'fullName email faculty campus avatarUrl isVerified',
      },
      {
        path: 'sellerId',
        select: 'fullName email faculty campus avatarUrl isVerified',
      },
      {
        path: 'participants',
        select: 'fullName email faculty campus avatarUrl isVerified isSuspended',
      },
    ]);

    res.status(201).json({
      success: true,
      conversation,
      isNew: true,
    });
  } catch (err) {
    // Handle race condition duplicate key
    if (err.code === 11000) {
      try {
        const existing = await Conversation.findOne({
          buyerId: req.user._id,
          listingId: req.body.listingId,
        })
          .populate({
            path: 'listingId',
            select: 'title price priceMode currency images status campus meetupSpots sellerId',
          })
          .populate({
            path: 'participants',
            select: 'fullName email faculty campus avatarUrl isVerified isSuspended',
          });
        return res.status(200).json({
          success: true,
          conversation: existing,
          isNew: false,
        });
      } catch (findErr) {
        return next(findErr);
      }
    }
    next(err);
  }
};

// ── GET /api/conversations/:id/messages ───────────────────────────────────────
export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID.',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    // Participant access check: ONLY the two participants can access
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    // Mark unread messages sent by other participants as read
    const updateResult = await Message.updateMany(
      {
        conversationId: conversation._id,
        senderId: { $ne: userId },
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Fetch messages sorted chronologically (ascending)
    // Note: text is stored raw and escaped on render in the frontend
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'fullName email faculty campus avatarUrl isVerified')
      .lean();

    // Emit read-receipt event and update unread count via socket if any messages were marked
    if (updateResult.modifiedCount > 0) {
      emitMessagesRead(conversation._id, userId);
      // Update unread count for the user who just read (now 0 for this conv)
      updateAndEmitUnreadCount(userId).catch(() => {});
    }

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/conversations/:id/messages ──────────────────────────────────────
export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { body, messageType = 'text', proposalDetails } = req.body;

    if (!OBJECT_ID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID.',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    // Participant access check: ONLY the two participants can access
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    // Validation: body required and max 1000 characters
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message body is required.',
      });
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 1000 characters.',
      });
    }

    // Identify other participant
    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== userId.toString()
    );

    if (otherParticipantId) {
      // Check if user has blocked other participant
      if (req.user.blockedUsers?.some((b) => b.toString() === otherParticipantId.toString())) {
        return res.status(400).json({
          success: false,
          message: 'You have blocked this user. Unblock them to send a message.',
        });
      }

      const otherUser = await User.findById(otherParticipantId);
      if (otherUser) {
        if (otherUser.isSuspended) {
          return res.status(400).json({
            success: false,
            message: 'This user account is suspended.',
          });
        }
        if (otherUser.blockedUsers?.some((b) => b.toString() === userId.toString())) {
          return res.status(400).json({
            success: false,
            message: 'You cannot send messages to this user.',
          });
        }
      }
    }

    // Validate meetup_proposal if provided
    let cleanProposalDetails = undefined;
    if (messageType === 'meetup_proposal') {
      if (!proposalDetails || !proposalDetails.location || !proposalDetails.meetupTime) {
        return res.status(400).json({
          success: false,
          message: 'Meetup proposals require a location and handover time.',
        });
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

    // Create message (raw text stored without HTML encoding so it's clean and escaped on render)
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: userId,
      body: trimmedBody,
      messageType: ['text', 'image', 'system', 'meetup_proposal'].includes(messageType)
        ? messageType
        : 'text',
      proposalDetails: cleanProposalDetails,
    });

    // Update conversation metadata
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    await message.populate('senderId', 'fullName email faculty campus avatarUrl isVerified');

    // Push new message to conversation room via Socket.IO (non-blocking)
    emitNewMessage(conversation._id, message).catch(() => {});

    // Notify the other participant's unread count changed
    if (otherParticipantId) {
      updateAndEmitUnreadCount(otherParticipantId).catch(() => {});

      // Create an in-app notification for the recipient if not actively in the conversation
      const sender = await User.findById(userId).select('fullName').lean();
      const recipient = await User.findById(otherParticipantId).select('email').lean();
      if (sender && recipient) {
        notifyNewMessage({
          conversationId: conversation._id,
          recipientId: otherParticipantId,
          recipientEmail: recipient.email,
          senderName: sender.fullName,
          messagePreview: message.body || '',
        }).catch(() => {});
      }
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/conversations/:id/messages/:messageId/proposal ─────────────────
export const respondToMeetupProposal = async (req, res, next) => {
  try {
    const { id, messageId } = req.params;
    const userId = req.user._id;
    const { status } = req.body;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'accepted' or 'declined'.",
      });
    }

    if (!OBJECT_ID_REGEX.test(id) || !OBJECT_ID_REGEX.test(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation or message ID.',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversationId: conversation._id,
    });

    if (!message || message.messageType !== 'meetup_proposal') {
      return res.status(404).json({
        success: false,
        message: 'Meetup proposal message not found.',
      });
    }

    message.proposalDetails.status = status;
    await message.save();
    await message.populate('senderId', 'fullName email faculty campus avatarUrl isVerified');

    // Notify conversation room of the proposal status change via Socket.IO
    emitProposalStatusChange(conversation._id, {
      messageId: message._id.toString(),
      status,
      message,
    });

    res.status(200).json({
      success: true,
      message,
    });
  } catch (err) {
    next(err);
  }
};
