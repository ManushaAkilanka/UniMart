import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'system', 'meetup_proposal'],
      default: 'text',
    },
    proposalDetails: {
      location: { type: String, trim: true, default: null },
      locationNotes: { type: String, trim: true, default: null },
      meetupTime: { type: String, trim: true, default: null },
      timeNotes: { type: String, trim: true, default: null },
      amount: { type: Number, default: null },
      status: {
        type: String,
        enum: ['proposed', 'accepted', 'declined'],
        default: 'proposed',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ conversationId: 1, isRead: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
