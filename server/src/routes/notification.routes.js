import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  markAllRead,
  markOneRead,
} from '../controllers/notification.controller.js';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);   // must be before /:id to avoid conflict
router.patch('/:id/read', markOneRead);

export default router;
