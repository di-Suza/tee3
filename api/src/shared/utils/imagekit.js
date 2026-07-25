import ImageKit from '@imagekit/nodejs';
import env from '../../config/env.js';
import logger from '../../config/logger.js';

let imagekitInstance = null;

if (env.IMAGEKIT_PUBLIC_KEY && env.IMAGEKIT_PRIVATE_KEY && env.IMAGEKIT_URL_ENDPOINT) {
  imagekitInstance = new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY,
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
  });
} else {
  logger.warn('ImageKit configuration is missing in .env. Image uploads will not work.');
}

import { BadRequestError } from '../errors/index.js';

/**
 * Uploads a file buffer to ImageKit.
 * 
 * @param {Buffer} fileBuffer - The file buffer from multer.
 * @param {string} originalName - Original name of the file.
 * @param {string} folder - Destination folder in ImageKit.
 * @returns {Promise<string>} The uploaded file URL, or null if failed/unconfigured.
 */
export const uploadImage = async (fileBuffer, originalName, folder = 'general') => {
  if (!imagekitInstance) {
    logger.error('ImageKit is not configured. Cannot upload image.');
    throw new BadRequestError('ImageKit is not configured. Please add IMAGEKIT keys to .env');
  }

  try {
    const response = await imagekitInstance.files.upload({
      file: fileBuffer.toString('base64'),
      fileName: originalName,
      folder: `/tee3/${folder}`,
    });
    return response.url;
  } catch (error) {
    logger.error({ error }, 'Failed to upload image to ImageKit');
    throw new BadRequestError(`Image upload failed: ${error.message || 'Check ImageKit credentials'}`);
  }
};

export default imagekitInstance;
