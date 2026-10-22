const { z } = require('zod');
const {
  POST_TYPES,
  POST_VISIBILITY_VALUES,
  POST_TEXT_MAX,
  POST_MEDIA_MAX,
  COMMENT_TEXT_MAX,
} = require('../config/constants');

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => /^https?:\/\/\S+$/i.test(value), {
    message: 'Media URLs must be valid http(s) URLs.',
  });

const mediaSchema = z.object({
  url: httpUrl,
  publicId: z.string().trim().max(512).optional(),
  provider: z.enum(['cloudinary', 'local', 'external']).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
});

const postCreateSchema = z.object({
  text: z.string().trim().max(POST_TEXT_MAX).optional(),
  media: z.array(mediaSchema).max(POST_MEDIA_MAX).optional(),
  type: z.enum(POST_TYPES).optional(),
  visibility: z.enum(POST_VISIBILITY_VALUES).optional(),
  sport: z.string().trim().max(80).optional(),
});

const postUpdateSchema = z.object({
  text: z.string().trim().max(POST_TEXT_MAX).optional(),
  media: z.array(mediaSchema).max(POST_MEDIA_MAX).optional(),
  visibility: z.enum(POST_VISIBILITY_VALUES).optional(),
  sport: z.string().trim().max(80).optional(),
});

const commentCreateSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Write a comment before sending.')
    .max(COMMENT_TEXT_MAX),
});

const shareCreateSchema = z.object({
  text: z.string().trim().max(POST_TEXT_MAX).optional(),
});

module.exports = {
  postCreateSchema,
  postUpdateSchema,
  commentCreateSchema,
  shareCreateSchema,
};
