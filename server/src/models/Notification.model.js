/**
 * Notification Model
 *
 * Stores per-user notification records. Types:
 *   message          – new chat message received (only when not actively in conversation)
 *   favorite         – someone favorited your listing
 *   listing_sold     – your favorited listing was marked sold
 *   report_resolved  – a report you submitted has been resolved
 *   claim            – someone claimed your free listing
 */
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    /** The user who should see this notification */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Notification category */
    type: {
      type: String,
      enum: ['message', 'favorite', 'listing_sold', 'report_resolved', 'claim'],
      required: true,
    },

    /** Short headline shown in the bell dropdown */
    title: {
      type: String,
      required: true,
      maxlength: 120,
    },

    /** One-line description */
    body: {
      type: String,
      required: true,
      maxlength: 280,
    },

    /** Frontend route the notification links to (e.g. '/messages?conversation=xyz') */
    linkTo: {
      type: String,
      default: null,
    },

    /** Whether the user has acknowledged (read) this notification */
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    /** Optional actor who triggered the notification (sender, claimer, etc.) */
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient "unread for user" queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
