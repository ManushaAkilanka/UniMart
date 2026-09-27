import mongoose from 'mongoose';

const { Schema } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const listingSchema = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title must not exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    listingType: {
      type: String,
      enum: ['sale', 'free', 'rent', 'exchange', 'wanted'],
      required: [true, 'Listing type is required'],
    },
    price: {
      type: Number,
      required: function () {
        return this.listingType !== 'free';
      },
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    priceMode: {
      type: String,
      enum: ['fixed', 'negotiable'],
      default: 'fixed',
    },
    currency: {
      type: String,
      default: 'LKR',
      enum: ['LKR'],
    },
    condition: {
      type: String,
      enum: ['new', 'like-new', 'used-good', 'used-fair'],
      required: function () {
        return this.listingType !== 'wanted';
      },
    },
    images: {
      type: [imageSchema],
      validate: {
        validator: function (v) {
          return v.length <= 8;
        },
        message: 'Maximum 8 images allowed per listing',
      },
      default: [],
    },
    campus: {
      type: String,
      required: [true, 'Campus is required'],
      trim: true,
    },
    meetupSpots: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'sold', 'hidden'],
      default: 'pending',
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Full-text search on title + description
listingSchema.index({ title: 'text', description: 'text' }, { weights: { title: 10, description: 5 } });

// Compound query indexes
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ status: 1, campus: 1, createdAt: -1 });
listingSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
listingSchema.index({ status: 1, listingType: 1, createdAt: -1 });
listingSchema.index({ status: 1, price: 1 });
listingSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
listingSchema.index({ campus: 1 });

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
