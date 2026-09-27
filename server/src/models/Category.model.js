import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [80, 'Category name must not exceed 80 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    icon: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
