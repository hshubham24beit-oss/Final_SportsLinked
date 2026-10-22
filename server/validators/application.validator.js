const { z } = require('zod');
const {
  APPLICATION_STATUSES,
  APPLICATION_DOCUMENTS_MAX,
} = require('../config/constants');

const documentInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().url().max(2048),
  publicId: z.string().trim().max(512).optional().default(''),
  provider: z.enum(['cloudinary', 'local']).optional().default('local'),
  mimeType: z.string().trim().max(160).optional().default(''),
  size: z.coerce.number().min(0).optional().default(0),
});

const applicationCreateSchema = z.object({
  coverNote: z.string().trim().max(2000).optional().default(''),
  documents: z.array(documentInputSchema).max(APPLICATION_DOCUMENTS_MAX).optional().default([]),
});

const applicationListQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const applicationStatusSchema = z.object({
  status: z.enum(['under_review', 'shortlisted', 'rejected', 'accepted']),
  note: z.string().trim().max(1000).optional().default(''),
});

module.exports = {
  applicationCreateSchema,
  applicationListQuerySchema,
  applicationStatusSchema,
};
