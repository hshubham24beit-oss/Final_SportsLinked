const { z } = require('zod');
const {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_SORT_OPTIONS,
  APPLICATION_STATUSES,
  ATHLETE_LEVELS,
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_COMPETITION_LEVELS,
  OPPORTUNITY_REQUIRED_DOCUMENTS_MAX,
} = require('../config/constants');

const optionalDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional(),
);
const requiredDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date(),
);
const optionalText = (max) => z.string().trim().max(max).optional();

const locationInput = z
  .object({
    city: z.string().trim().max(100).optional(),
    region: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .optional();

const eligibilitySchema = z
  .object({
    ageCategories: z.array(z.enum(ATHLETE_AGE_CATEGORIES)).max(10).optional(),
    competitionLevels: z.array(z.enum(ATHLETE_COMPETITION_LEVELS)).max(10).optional(),
    levels: z.array(z.enum(ATHLETE_LEVELS)).max(10).optional(),
    minExperienceYears: z.coerce.number().min(0).max(80).optional(),
    maxExperienceYears: z.coerce.number().min(0).max(80).optional(),
    requiresVerifiedAchievement: z.boolean().optional(),
    notes: optionalText(2000),
  })
  .superRefine((value, context) => {
    if (
      value.minExperienceYears !== undefined &&
      value.maxExperienceYears !== undefined &&
      value.minExperienceYears > value.maxExperienceYears
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxExperienceYears'],
        message: 'Maximum experience must be greater than or equal to the minimum.',
      });
    }
  });

const opportunityShape = {
  type: z.enum(OPPORTUNITY_CATEGORIES),
  title: z.string().trim().min(3, 'Enter an opportunity title.').max(160),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the opportunity in at least 10 characters.')
    .max(10000),
  sport: z.string().trim().min(1, 'Enter a sport.').max(80),
  positions: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  eligibility: eligibilitySchema.optional(),
  location: locationInput,
  eventStartDate: optionalDate,
  eventEndDate: optionalDate,
  deadline: requiredDate,
  requiredDocuments: z
    .array(z.string().trim().min(1).max(120))
    .max(OPPORTUNITY_REQUIRED_DOCUMENTS_MAX)
    .optional(),
  positionsAvailable: z.coerce.number().int().min(1).max(10000).optional(),
  contactInstructions: optionalText(2000),
};

function validateDates(value, context) {
  if (
    value.eventStartDate &&
    value.eventEndDate &&
    value.eventStartDate > value.eventEndDate
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventEndDate'],
      message: 'The end date must be on or after the start date.',
    });
  }
}

const opportunityCreateSchema = z
  .object(opportunityShape)
  .superRefine(validateDates);

const opportunityUpdateSchema = z
  .object(opportunityShape)
  .partial()
  .superRefine(validateDates);

const opportunityListQuerySchema = z.object({
  q: optionalText(120),
  type: z.enum(OPPORTUNITY_CATEGORIES).optional(),
  sport: optionalText(80),
  position: optionalText(80),
  location: optionalText(100),
  sort: z.enum(OPPORTUNITY_SORT_OPTIONS).default('deadline'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const opportunityMineQuerySchema = z.object({
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const opportunitySavedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const applicantListQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

module.exports = {
  opportunityCreateSchema,
  opportunityUpdateSchema,
  opportunityListQuerySchema,
  opportunityMineQuerySchema,
  opportunitySavedQuerySchema,
  applicantListQuerySchema,
};
