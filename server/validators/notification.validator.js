const { z } = require('zod');

const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const notificationPreferenceSchema = z
  .object({
    messages: z.boolean().optional(),
    connections: z.boolean().optional(),
    applications: z.boolean().optional(),
    verifications: z.boolean().optional(),
    social: z.boolean().optional(),
    events: z.boolean().optional(),
    teams: z.boolean().optional(),
    opportunityDeadlines: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Choose at least one notification preference.',
  });

module.exports = { notificationListQuerySchema, notificationPreferenceSchema };
