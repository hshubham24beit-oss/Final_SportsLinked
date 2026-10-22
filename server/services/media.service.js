const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const cloudinary = require('cloudinary').v2;
const config = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const {
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  APPLICATION_DOCUMENT_MAX_BYTES,
} = require('../config/constants');

const uploadsRoot = config.uploadsDir;

if (config.cloudinary.configured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

const extensionByType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

function hasValidSignature(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return false;
  }

  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function validateImage(file) {
  if (!file) {
    throw ApiError.badRequest('Choose an image to upload.', 'IMAGE_REQUIRED');
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new ApiError(415, 'Please upload a JPEG, PNG, or WebP image.', 'UNSUPPORTED_IMAGE_TYPE');
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new ApiError(413, 'Images must be 5 MB or smaller.', 'IMAGE_TOO_LARGE');
  }
  if (!hasValidSignature(file.buffer, file.mimetype)) {
    throw new ApiError(
      415,
      'The uploaded file does not appear to be a valid image.',
      'INVALID_IMAGE_CONTENT',
    );
  }
}

function hasValidDocumentSignature(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return false;
  }

  if (mimetype === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (mimetype === 'application/msword') {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  }
  return false;
}

function validateDocument(file) {
  if (!file) {
    throw ApiError.badRequest('Choose a document to upload.', 'DOCUMENT_REQUIRED');
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    throw new ApiError(
      415,
      'Please upload a PDF, DOC, or DOCX document.',
      'UNSUPPORTED_DOCUMENT_TYPE',
    );
  }
  if (file.size > APPLICATION_DOCUMENT_MAX_BYTES) {
    throw new ApiError(413, 'Documents must be 10 MB or smaller.', 'DOCUMENT_TOO_LARGE');
  }
  if (!hasValidDocumentSignature(file.buffer, file.mimetype)) {
    throw new ApiError(
      415,
      'The uploaded file does not appear to be a valid document.',
      'INVALID_DOCUMENT_CONTENT',
    );
  }
}

function uploadDocumentToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${config.cloudinary.folder}/${folder}`,
        resource_type: 'raw',
        use_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new ApiError(
              502,
              'The document could not be uploaded. Please try again.',
              'DOCUMENT_UPLOAD_FAILED',
            ),
          );
        }
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary',
        });
      },
    );
    stream.end(file.buffer);
  });
}

async function uploadDocumentToLocal(file, folder) {
  if (config.isProduction) {
    throw new ApiError(
      503,
      'Document uploads are not configured. Please contact support.',
      'DOCUMENT_UPLOAD_UNAVAILABLE',
    );
  }

  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'documents';
  const directory = path.join(uploadsRoot, safeFolder);
  await fs.mkdir(directory, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${extensionByType[file.mimetype]}`;
  await fs.writeFile(path.join(directory, filename), file.buffer);

  return {
    url: `${config.publicApiUrl}/uploads/${safeFolder}/${filename}`,
    publicId: `${safeFolder}/${filename}`,
    provider: 'local',
  };
}

async function uploadDocument(file, { folder = 'documents' } = {}) {
  validateDocument(file);

  if (config.cloudinary.configured) {
    return uploadDocumentToCloudinary(file, folder);
  }

  return uploadDocumentToLocal(file, folder);
}

async function deleteDocument(media) {
  if (!media?.publicId) {
    return;
  }

  if (media.provider === 'cloudinary') {
    await cloudinary.uploader.destroy(media.publicId, {
      resource_type: 'raw',
      invalidate: true,
    });
    return;
  }

  if (media.provider === 'local') {
    const target = path.resolve(uploadsRoot, media.publicId);
    if (!target.startsWith(`${uploadsRoot}${path.sep}`)) {
      return;
    }
    await fs.unlink(target).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }
}

function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${config.cloudinary.folder}/${folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 2000, height: 2000, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new ApiError(502, 'The image could not be uploaded. Please try again.', 'IMAGE_UPLOAD_FAILED'),
          );
        }
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary',
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(file.buffer);
  });
}

async function uploadToLocal(file, folder) {
  if (config.isProduction) {
    throw new ApiError(
      503,
      'Image uploads are not configured. Please contact support.',
      'IMAGE_UPLOAD_UNAVAILABLE',
    );
  }

  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'profiles';
  const directory = path.join(uploadsRoot, safeFolder);
  await fs.mkdir(directory, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${extensionByType[file.mimetype]}`;
  await fs.writeFile(path.join(directory, filename), file.buffer);

  return {
    url: `${config.publicApiUrl}/uploads/${safeFolder}/${filename}`,
    publicId: `${safeFolder}/${filename}`,
    provider: 'local',
  };
}

async function uploadImage(file, { folder = 'profiles' } = {}) {
  validateImage(file);

  if (config.cloudinary.configured) {
    return uploadToCloudinary(file, folder);
  }

  return uploadToLocal(file, folder);
}

async function deleteImage(media) {
  if (!media || !media.publicId) {
    return;
  }

  if (media.provider === 'cloudinary') {
    await cloudinary.uploader.destroy(media.publicId, { invalidate: true });
    return;
  }

  if (media.provider === 'local') {
    const target = path.resolve(uploadsRoot, media.publicId);
    if (!target.startsWith(`${uploadsRoot}${path.sep}`)) {
      return;
    }
    await fs.unlink(target).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }
}

async function safeDeleteImage(media) {
  try {
    await deleteImage(media);
  } catch (error) {
    logger.error(`Failed to delete media asset ${media?.publicId || 'unknown'}`, error);
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  safeDeleteImage,
  validateImage,
  uploadDocument,
  deleteDocument,
  validateDocument,
  uploadsRoot,
};
