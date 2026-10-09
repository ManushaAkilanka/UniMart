import multer from 'multer';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

// Memory storage for inspecting file buffers and magic bytes
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per file
    files: 6, // max 6 files
  },
});

/**
 * Validates the raw file buffer magic bytes (file signature).
 * Supported: JPEG, PNG, WebP.
 * @param {Buffer} buffer
 * @returns {string|null} Detected mime type or null if invalid
 */
export function checkImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isRiff && isWebp) {
    return 'image/webp';
  }

  return null;
}

/**
 * Middleware handling Multer multipart/form-data upload, file signature checking,
 * and Cloudinary upload. Attaches uploaded images array to `req.uploadedImages`
 * and populates `req.body.images`.
 */
export const handleListingImageUpload = (req, res, next) => {
  upload.array('images', 6)(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds the 5 MB limit. Please compress your photos.',
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Maximum 6 images allowed per listing.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    // If no files uploaded via multipart form
    if (!req.files || req.files.length === 0) {
      req.uploadedImages = [];
      return next();
    }

    try {
      // 1. Verify file signature for every uploaded file
      for (const file of req.files) {
        const detectedType = checkImageSignature(file.buffer);
        if (!detectedType) {
          return res.status(400).json({
            success: false,
            message: `Invalid file signature for "${file.originalname}". Only genuine JPEG, PNG, and WebP images are accepted.`,
          });
        }
      }

      // 2. Upload each verified image to Cloudinary
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'unimart/listings')
      );
      const uploadedImages = await Promise.all(uploadPromises);

      req.uploadedImages = uploadedImages;

      // Merge into req.body.images
      if (req.body.images && Array.isArray(req.body.images)) {
        req.body.images = [...req.body.images, ...uploadedImages];
      } else {
        req.body.images = uploadedImages;
      }

      next();
    } catch (uploadErr) {
      console.error('[Upload Middleware] Cloudinary upload failure:', uploadErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to process and upload listing images. Please try again.',
      });
    }
  });
};

/**
 * Middleware handling single profile avatar upload via Multer,
 * file signature checking, and Cloudinary upload to 'unimart/avatars'.
 * Sets req.body.avatarUrl to the uploaded image URL.
 */
export const handleAvatarUpload = (req, res, next) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Avatar size exceeds the 5 MB limit. Please compress your photo.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    // If no file uploaded via multipart, proceed (supports JSON or existing URL fallback)
    if (!req.file) {
      return next();
    }

    try {
      const detectedType = checkImageSignature(req.file.buffer);
      if (!detectedType) {
        return res.status(400).json({
          success: false,
          message: `Invalid file signature for "${req.file.originalname}". Only genuine JPEG, PNG, and WebP images are accepted.`,
        });
      }

      const uploaded = await uploadToCloudinary(req.file.buffer, 'unimart/avatars');
      req.body.avatarUrl = uploaded.url;
      next();
    } catch (uploadErr) {
      console.error('[Upload Middleware] Cloudinary avatar upload failure:', uploadErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to process and upload avatar image. Please try again.',
      });
    }
  });
};

