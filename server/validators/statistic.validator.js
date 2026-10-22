const { z } = require('zod');

const dateInput = z
  .union([z.string().trim(), z.date()])
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: 'Enter a valid date.',
  });

const statisticCreateSchema = z.object({
  metric: z.string().trim().min(1, 'Enter a metric.').max(120),
  value: z.number().finite().min(-1000000).max(1000000),
  unit: z.string().trim().max(30).optional(),
  date: dateInput,
});

const statisticUpdateSchema = statisticCreateSchema.partial();

module.exports = { statisticCreateSchema, statisticUpdateSchema };
