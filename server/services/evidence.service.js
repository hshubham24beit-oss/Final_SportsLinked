const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const cloudinary = require('cloudinary').v2;
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const {
  ALLOWED_EVIDENCE_TYPES,
  VERIFICATION_EVIDENCE_MAX_BYTES,
  VERIFICATION_SIGNED_URL_TTL_SECONDS,
} = require('../config/constants');

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
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return false;
  }
  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
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

function validateEvidenceFile(file) {
  if (!file) {
    throw ApiError.badRequest('Choose a file to upload.', 'EVIDENCE_REQUIRED');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.mimetype)) {
    throw new ApiError(
      415,
      'Evidence must be an image, PDF, DOC, or DOCX file.',
      'UNSUPPORTED_EVIDENCE_TYPE',
    );
  }
  if (file.size > VERIFICATION_EVIDENCE_MAX_BYTES) {
    throw new ApiError(413, 'Evidence files must be 10 MB or smaller.', 'EVIDENCE_TOO_LARGE');
  }
  if (!hasValidSignature(file.buffer, file.mimetype)) {
    throw new ApiError(
      415,
      'The uploaded evidence does not appear to be a valid file.',
      'INVALID_EVIDENCE_CONTENT',
    );
  }
}

function cloudinaryResourceType(mimetype) {
  return mimetype.startsWith('image/') ? 'image' : 'raw';
}

function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${config.cloudinary.folder}/${folder}`,
        resource_type: cloudinaryResourceType(file.mimetype),
        type: 'authenticated',
        use_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new ApiError(
              502,
              'The evidence could not be uploaded. Please try again.',
              'EVIDENCE_UPLOAD_FAILED',
            ),
          );
        }
        return resolve({
          provider: 'cloudinary',
          publicId: result.public_id,
          resourceType: cloudinaryResourceType(file.mimetype),
          deliveryType: 'authenticated',
        });
      },
    );
    stream.end(file.buffer);
  });
}

async function uploadToLocal(file, folder) {
  if (config.isProduction && !config.cloudinary.configured) {
    throw new ApiError(
      503,
      'Private evidence storage is not configured. Please contact support.',
      'EVIDENCE_STORAGE_UNAVAILABLE',
    );
  }

  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '');
  const directory = path.join(config.privateUploadsDir, safeFolder);
  await fs.mkdir(directory, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${extensionByType[file.mimetype]}`;
  await fs.writeFile(path.join(directory, filename), file.buffer);

  return {
    provider: 'local',
    publicId: `${safeFolder}/${filename}`,
    resourceType: cloudinaryResourceType(file.mimetype),
    deliveryType: 'authenticated',
  };
}

async function uploadEvidence(file, { folder = 'verification-evidence' } = {}) {
  validateEvidenceFile(file);

  const storage = config.cloudinary.configured
    ? await uploadToCloudinary(file, folder)
    : await uploadToLocal(file, folder);

  return {
    storage,
    originalName: String(file.originalname || '').slice(0, 255),
    mimeType: file.mimetype,
    size: file.size,
  };
}

function signLocalToken(evidenceId) {
  const payload = Buffer.from(
    JSON.stringify({
      e: String(evidenceId),
      exp: Math.floor(Date.now() / 1000) + VERIFICATION_SIGNED_URL_TTL_SECONDS,
    }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.jwt.accessSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function resolveLocalToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) {
    throw ApiError.forbidden('This evidence link is invalid or has expired.', 'EVIDENCE_LINK_INVALID');
  }

  const expected = crypto
    .createHmac('sha256', config.jwt.accessSecret)
    .update(payload)
    .digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw ApiError.forbidden('This evidence link is invalid or has expired.', 'EVIDENCE_LINK_INVALID');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw ApiError.forbidden('This evidence link is invalid or has expired.', 'EVIDENCE_LINK_INVALID');
  }
  if (!parsed.e || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
    throw ApiError.forbidden('This evidence link is invalid or has expired.', 'EVIDENCE_LINK_INVALID');
  }
  return parsed.e;
}

function createSignedEvidenceUrl(evidence) {
  const expiresAt = new Date(
    Date.now() + VERIFICATION_SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();

  if (evidence.storage.provider === 'cloudinary') {
    return {
      url: cloudinary.url(evidence.storage.publicId, {
        resource_type: evidence.storage.resourceType || 'raw',
        type: 'authenticated',
        sign_url: true,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + VERIFICATION_SIGNED_URL_TTL_SECONDS,
      }),
      expiresAt,
    };
  }

  return {
    url: `${config.publicApiUrl}/api/v1/verifications/evidence/${signLocalToken(
      evidence._id || evidence.id,
    )}`,
    expiresAt,
  };
}

async function readLocalEvidence(evidence) {
  const target = path.resolve(config.privateUploadsDir, evidence.storage.publicId);
  if (!target.startsWith(`${config.privateUploadsDir}${path.sep}`)) {
    throw ApiError.notFound('Evidence not found.', 'EVIDENCE_NOT_FOUND');
  }
  try {
    return await fs.readFile(target);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw ApiError.notFound('Evidence not found.', 'EVIDENCE_NOT_FOUND');
    }
    throw error;
  }
}

async function deleteEvidenceAsset(evidence) {
  if (!evidence?.storage) {
    return;
  }

  if (evidence.storage.provider === 'cloudinary') {
    await cloudinary.uploader.destroy(evidence.storage.publicId, {
      resource_type: evidence.storage.resourceType || 'raw',
      type: 'authenticated',
      invalidate: true,
    });
    return;
  }

  const target = path.resolve(config.privateUploadsDir, evidence.storage.publicId);
  if (!target.startsWith(`${config.privateUploadsDir}${path.sep}`)) {
    return;
  }
  await fs.unlink(target).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}

module.exports = {
  uploadEvidence,
  createSignedEvidenceUrl,
  resolveLocalToken,
  readLocalEvidence,
  deleteEvidenceAsset,
  validateEvidenceFile,
};
