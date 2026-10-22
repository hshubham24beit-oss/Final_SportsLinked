const multer = require('multer');
const ApiError = require('../utils/ApiError');
const {
  IMAGE_MAX_BYTES,
  ALLOWED_IMAGE_TYPES,
  APPLICATION_DOCUMENT_MAX_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  VERIFICATION_EVIDENCE_MAX_BYTES,
  ALLOWED_EVIDENCE_TYPES,
} = require('../config/constants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES, files: 1, fields: 10 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return callback(
        new ApiError(
          415,
          'Please upload a JPEG, PNG, or WebP image.',
          'UNSUPPORTED_IMAGE_TYPE',
        ),
      );
    }
    return callback(null, true);
  },
});

function singleImageUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(413, 'Images must be 5 MB or smaller.', 'IMAGE_TOO_LARGE'),
        );
      }
      return next(new ApiError(400, 'The image upload could not be processed.', 'UPLOAD_INVALID'));
    }

    return next(error);
  });
}

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: APPLICATION_DOCUMENT_MAX_BYTES, files: 1, fields: 5 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      return callback(
        new ApiError(
          415,
          'Please upload a PDF, DOC, or DOCX document.',
          'UNSUPPORTED_DOCUMENT_TYPE',
        ),
      );
    }
    return callback(null, true);
  },
});

function singleDocumentUpload(req, res, next) {
  documentUpload.single('document')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(413, 'Documents must be 10 MB or smaller.', 'DOCUMENT_TOO_LARGE'),
        );
      }
      return next(
        new ApiError(400, 'The document upload could not be processed.', 'UPLOAD_INVALID'),
      );
    }

    return next(error);
  });
}

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VERIFICATION_EVIDENCE_MAX_BYTES, files: 1, fields: 5 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_EVIDENCE_TYPES.includes(file.mimetype)) {
      return callback(
        new ApiError(
          415,
          'Evidence must be an image, PDF, DOC, or DOCX file.',
          'UNSUPPORTED_EVIDENCE_TYPE',
        ),
      );
    }
    return callback(null, true);
  },
});

function singleEvidenceUpload(req, res, next) {
  evidenceUpload.single('evidence')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(413, 'Evidence files must be 10 MB or smaller.', 'EVIDENCE_TOO_LARGE'),
        );
      }
      return next(
        new ApiError(400, 'The evidence upload could not be processed.', 'UPLOAD_INVALID'),
      );
    }

    return next(error);
  });
}

module.exports = { singleImageUpload, singleDocumentUpload, singleEvidenceUpload };
