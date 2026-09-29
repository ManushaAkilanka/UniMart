import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/unimart',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_jwt_key_unimart',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Email / SMTP
  SMTP_HOST: process.env.SMTP_HOST || null,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || null,
  SMTP_PASS: process.env.SMTP_PASS || null,
  EMAIL_FROM: process.env.EMAIL_FROM || 'UniMart <noreply@unimart.lk>',

  // Auth
  VERIFICATION_CODE_EXPIRY_MINUTES: Number(process.env.VERIFICATION_CODE_EXPIRY_MINUTES) || 15,
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES) || 15,
  LOGIN_RATE_LIMIT_MAX: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,

  // Admin seed
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@cmb.ac.lk',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@UniMart2024!',
  ADMIN_FULL_NAME: process.env.ADMIN_FULL_NAME || 'UniMart Admin',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || null,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || null,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || null,

  // Admin moderation setting (default: active)
  DEFAULT_LISTING_STATUS:
    process.env.ADMIN_SETTING_LISTING_STATUS === 'pending' ||
    process.env.ADMIN_SETTING_REQUIRE_APPROVAL === 'true' ||
    process.env.REQUIRE_LISTING_APPROVAL === 'true'
      ? 'pending'
      : (process.env.ADMIN_SETTING_DEFAULT_STATUS || 'active'),
};
