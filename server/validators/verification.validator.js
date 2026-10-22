const { z } = require('zod');
const {
  VERIFICATION_TYPES,
  VERIFICATION_STATUSES,
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
  REPORT_STATUSES,
  USER_STATUS,
} = require('../config/constants');

const optionalText = (max) => z.string().trim().max(max).optional();

const officialLinkSchema = z.object({
  url: z.string().trim().url().max(2048),
  label: z.string().trim().max(160).optional().default(''),
});

const qualificationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().min(1).max(160),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  officialUrl: z.string().trim().url().max(2048).optional().or(z.literal('')),
});

const verificationSubmitSchema = z
  .object({
    type: z.enum(VERIFICATION_TYPES),
    achievementId: z.string().trim().optional(),
    qualification: qualificationSchema.optional(),
    statement: optionalText(2000).default(''),
    evidenceIds: z.array(z.string().trim()).max(5).optional().default([]),
    officialLinks: z.array(officialLinkSchema).max(5).optional().default([]),
  })
  .superRefine((value, context) => {
    if (value.type === 'achievement' && !value.achievementId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['achievementId'],
        message: 'Choose an achievement to verify.',
      });
    }
    if (value.type === 'qualification' && !value.qualification) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['qualification'],
        message: 'Add qualification details.',
      });
    }
  });

const verificationResubmitSchema = z.object({
  statement: optionalText(2000),
  evidenceIds: z.array(z.string().trim()).max(5).optional().default([]),
  officialLinks: z.array(officialLinkSchema).max(5).optional(),
});

const verificationListQuerySchema = z.object({
  status: z.enum(VERIFICATION_STATUSES).optional(),
  type: z.enum(VERIFICATION_TYPES).optional(),
  reviewer: z.enum(['me']).optional(),
  q: optionalText(120),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const verificationDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().min(3, 'Add a short review note.').max(2000),
  expiresAt: z.coerce.date().optional(),
});

const reportCreateSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(128),
  reason: z.enum(REPORT_REASONS),
  details: optionalText(2000).default(''),
});

const reportListQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  targetType: z.enum(REPORT_TARGET_TYPES).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  q: optionalText(120),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(15),
});

const reportUpdateSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  resolution: optionalText(2000).default(''),
});

const blockCreateSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  reason: optionalText(500).default(''),
});

const adminUserListQuerySchema = z.object({
  role: z.enum(['athlete', 'coach', 'recruiter', 'admin']).optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  q: optionalText(120),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(20),
});

const adminUserStatusSchema = z.object({
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED, USER_STATUS.SUSPENDED]),
  reason: z.string().trim().min(3, 'Add a moderation reason.').max(2000),
});

const adminActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

module.exports = {
  verificationSubmitSchema,
  verificationResubmitSchema,
  verificationListQuerySchema,
  verificationDecisionSchema,
  reportCreateSchema,
  reportListQuerySchema,
  reportUpdateSchema,
  blockCreateSchema,
  adminUserListQuerySchema,
  adminUserStatusSchema,
  adminActivityQuerySchema,
};
