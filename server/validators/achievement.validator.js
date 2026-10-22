const { z } = require('zod');
const { ACHIEVEMENT_EVIDENCE_MAX } = require('../config/constants');

const dateInput = z
  .union([z.string().trim(), z.date()])
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: 'Enter a valid date.',
  });

const evidenceRefSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => /^https?:\/\/\S+$/i.test(value), {
      message: 'Evidence links must be valid http(s) URLs.',
    }),
  label: z.string().trim().max(160).optional(),
});

const achievementCreateSchema = z.object({
  title: z.string().trim().min(2, 'Enter an achievement title.').max(160),
  sport: z.string().trim().min(1, 'Enter a sport.').max(80),
  competition: z.string().trim().max(160).optional(),
  result: z.string().trim().max(160).optional(),
  date: dateInput,
  description: z.string().trim().max(2000).optional(),
  evidenceRefs: z.array(evidenceRefSchema).max(ACHIEVEMENT_EVIDENCE_MAX).optional(),
});

const achievementUpdateSchema = achievementCreateSchema.partial();

module.exports = { achievementCreateSchema, achievementUpdateSchema };
