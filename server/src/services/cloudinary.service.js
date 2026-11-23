import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

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
 * Detect extension from buffer magic bytes
 */
function getExtensionFromBuffer(buffer) {
  if (buffer && buffer.length >= 8) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  }
  return 'jpg';
}

/**
 * Upload an image buffer to Cloudinary or fallback to local disk storage.
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} folder - Destination folder on Cloudinary / local category
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadToCloudinary(buffer, folder = 'unimart/listings') {
  if (!isConfigured) {
    if (ENV.NODE_ENV === 'production') {
      throw new Error('Local disk avatar fallback is disabled in production. Cloudinary credentials are required.');
    }
    // Graceful and working fallback for local development & testing environments
    const ext = getExtensionFromBuffer(buffer);
    const targetDir = path.join(UPLOADS_DIR, folder);
    const baseFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, baseFilename);
    await fs.promises.writeFile(filePath, buffer);

    const baseUrl = process.env.API_URL || `http://localhost:${ENV.PORT || 5000}`;
    return {
      url: `${baseUrl}/uploads/${folder}/${baseFilename}`,
      publicId: `local/${folder}/${baseFilename}`,
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
 * Delete an asset from Cloudinary or local disk by its publicId.
 * @param {string} publicId - The public ID of the resource
 * @returns {Promise<{ result: string }>}
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return { result: 'not_found' };

  if (publicId.startsWith('local/')) {
    const filename = publicId.replace('local/', '');
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
        return { result: 'ok' };
      } catch (err) {
        console.warn(`[Local Upload] Failed to delete file ${filename}:`, err.message);
        return { result: 'error', error: err.message };
      }
    }
    return { result: 'ok' };
  }

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

