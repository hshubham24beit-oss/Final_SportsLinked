const { z } = require('zod');
const {
  EVENT_TYPES,
  EVENT_STATUSES,
  EVENT_SORT_OPTIONS,
  EVENT_REGISTRATION_STATUSES,
  EVENT_CAPACITY_MAX,
  EVENT_CANCELLATION_REASON_MAX,
} = require('../config/constants');

const optionalText = (max) => z.string().trim().max(max).optional();
const requiredDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date(),
);
const locationInput = z
  .object({
    city: z.string().trim().max(100).optional(),
    region: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .optional();

const venueInput = z
  .object({
    name: z.string().trim().max(160).optional(),
    address: z.string().trim().max(300).optional(),
    location: locationInput,
  })
  .optional();

const eventShape = {
  title: z.string().trim().min(3, 'Enter an event title.').max(160),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the event in at least 10 characters.')
    .max(10000),
  sport: z.string().trim().min(1, 'Enter a sport.').max(80),
  type: z.enum(EVENT_TYPES).optional(),
  startAt: requiredDate,
  endAt: requiredDate,
  registrationDeadline: requiredDate,
  venue: venueInput,
  capacity: z.coerce.number().int().min(1).max(EVENT_CAPACITY_MAX),
  allowWaitlist: z.boolean().optional(),
};

function validateSchedule(value, context) {
  if (value.startAt && value.endAt && value.endAt < value.startAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endAt'],
      message: 'The event end must be on or after its start.',
    });
  }
  if (
    value.registrationDeadline &&
    value.startAt &&
    value.registrationDeadline > value.startAt
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['registrationDeadline'],
      message: 'Registration must close no later than the event start.',
    });
  }
}

const eventCreateSchema = z.object(eventShape).superRefine(validateSchedule);
const eventUpdateSchema = z
  .object(eventShape)
  .partial()
  .superRefine(validateSchedule);

const eventListQuerySchema = z.object({
  q: optionalText(120),
  sport: optionalText(80),
  location: optionalText(100),
  type: z.enum(EVENT_TYPES).optional(),
  sort: z.enum(EVENT_SORT_OPTIONS).default('date'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const eventMineQuerySchema = z.object({
  status: z.enum(EVENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const eventRegistrantsQuerySchema = z.object({
  status: z.enum(EVENT_REGISTRATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

const eventCancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(EVENT_CANCELLATION_REASON_MAX)
    .optional()
    .default(''),
});

module.exports = {
  eventCreateSchema,
  eventUpdateSchema,
  eventListQuerySchema,
  eventMineQuerySchema,
  eventRegistrantsQuerySchema,
  eventCancelSchema,
};
