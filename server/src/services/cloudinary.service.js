import { v2 as cloudinary } from 'cloudinary';
import { ENV } from '../config/env.js';

let isConfigured = false;

if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
  });
  isConfigured = true;
}

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadToCloudinary(buffer, folder = 'unimart/listings') {
  if (!isConfigured) {
    // Graceful fallback for local development & testing environments
    const mockPublicId = `${folder}/mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      url: `https://res.cloudinary.com/demo/image/upload/${mockPublicId}.jpg`,
      publicId: mockPublicId,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, height: 1200, crop: 'limit' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its publicId.
 * @param {string} publicId - The public ID of the resource
 * @returns {Promise<{ result: string }>}
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return { result: 'not_found' };

  if (!isConfigured) {
    return { result: 'ok' };
  }

  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete image ${publicId}:`, err.message);
    return { result: 'error', error: err.message };
  }
}
