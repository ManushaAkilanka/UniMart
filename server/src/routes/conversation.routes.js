import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as convController from '../controllers/conversation.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ENV } from '../config/env.js';

const router = Router();

// Rate limiter for sending messages: 30 messages per minute
const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many messages sent. Please slow down and wait a moment.',
  },
  skip: () => ENV.NODE_ENV === 'test',
});

// All conversation & message routes require authentication (which blocks suspended users)
router.use(requireAuth);

// GET/POST /api/conversations
router.get('/', convController.getConversations);
router.get('/unread-count', convController.getUnreadCount);
router.post('/', convController.createOrGetConversation);

// GET/POST /api/conversations/:id/messages
router.get('/:id/messages', convController.getMessages);
router.post('/:id/messages', messageRateLimiter, convController.sendMessage);

// Meetup proposal response
router.patch('/:id/messages/:messageId/proposal', convController.respondToMeetupProposal);

export default router;
