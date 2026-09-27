import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['listing', 'user', 'message'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'inappropriate_content',
        'misleading_information',
        'prohibited_item',
        'fraud',
        'harassment',
        'other',
      ],
      required: [true, 'Report reason is required'],
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, 'Report details cannot exceed 1000 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    resolution: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reviewedBy: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
