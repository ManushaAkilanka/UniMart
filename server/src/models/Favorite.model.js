import mongoose from 'mongoose';

const { Schema } = mongoose;

const favoriteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: a user can only favorite a listing once
favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });
favoriteSchema.index({ listingId: 1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;
