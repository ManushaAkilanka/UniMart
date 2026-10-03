import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        'Password is required',
      ],
      select: false, // Never return password by default
    },
    googleId: {
      type: String,
      sparse: true,
      default: null,
    },
    studentId: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    faculty: {
      type: String,
      trim: true,
      default: null,
    },
    campus: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['student', 'moderator', 'admin'],
      default: 'student',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedReason: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Email verification fields
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.emailVerificationCode;
        delete ret.emailVerificationExpiry;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ campus: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ isSuspended: 1 });

// Instance method: compare password
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Instance method: check if verification code is valid
userSchema.methods.isVerificationCodeValid = function (code) {
  if (!this.emailVerificationCode || !this.emailVerificationExpiry) return false;
  if (Date.now() > this.emailVerificationExpiry.getTime()) return false;
  return bcrypt.compareSync(code, this.emailVerificationCode);
};

const User = mongoose.model('User', userSchema);

export default User;
