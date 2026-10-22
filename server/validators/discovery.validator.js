const { z } = require('zod');
const {
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_COMPETITION_LEVELS,
  ATHLETE_LEVELS,
  DISCOVERY_SORT_OPTIONS,
} = require('../config/constants');

const optionalText = (max) => z.string().trim().max(max).optional();

const booleanFlag = z.preprocess((value) => {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0' || value === '') {
    return false;
  }
  return value;
}, z.boolean().optional());

const paginationShape = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
};

const discoveryQuerySchema = z
  .object({
    q: optionalText(120),
    sport: optionalText(80),
    position: optionalText(80),
    skill: optionalText(80),
    team: optionalText(160),
    location: optionalText(100),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(500).optional(),
    nearMe: booleanFlag,
    ageCategory: z.enum(ATHLETE_AGE_CATEGORIES).optional(),
    level: z.enum(ATHLETE_LEVELS).optional(),
    competitionLevel: z.enum(ATHLETE_COMPETITION_LEVELS).optional(),
    achievements: z.enum(['any']).optional(),
    verification: z.enum(['verified']).optional(),
    statMetric: optionalText(120),
    statMin: z.coerce.number().min(-1000000).max(1000000).optional(),
    statMax: z.coerce.number().min(-1000000).max(1000000).optional(),
    availableForTrials: booleanFlag,
    sort: z.enum(DISCOVERY_SORT_OPTIONS).default('relevance'),
    ...paginationShape,
  })
  .superRefine((query, context) => {
    if ((query.lat === undefined) !== (query.lng === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lat'],
        message: 'Provide both latitude and longitude, or neither.',
      });
    }

    if (query.nearMe && (query.lat !== undefined || query.lng !== undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nearMe'],
        message: 'Use either a map location or your profile location, not both.',
      });
    }

    if ((query.statMin !== undefined || query.statMax !== undefined) && !query.statMetric) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['statMetric'],
        message: 'Choose a statistic before adding a range.',
      });
    }

    if (
      query.statMin !== undefined &&
      query.statMax !== undefined &&
      query.statMin > query.statMax
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['statMax'],
        message: 'The maximum value must be greater than or equal to the minimum.',
      });
    }
  });

const savedListQuerySchema = z.object({
  ...paginationShape,
});

module.exports = {
  discoveryQuerySchema,
  savedListQuerySchema,
};
