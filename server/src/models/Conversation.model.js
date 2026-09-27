import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ listingId: 1 });
conversationSchema.index({ participants: 1, listingId: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
