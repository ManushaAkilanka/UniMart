import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      // Examples: 'user.suspended', 'listing.hidden', 'user.role_changed', 'listing.approved'
    },
    targetType: {
      type: String,
      enum: ['user', 'listing', 'category', 'report', 'conversation', 'message'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
