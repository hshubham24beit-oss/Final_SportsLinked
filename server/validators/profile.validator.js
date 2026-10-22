const { z } = require('zod');
const {
  ROLES,
  VISIBILITY_VALUES,
  ATHLETE_LEVELS,
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_COMPETITION_LEVELS,
  ATHLETE_SKILLS_MAX,
  OPPORTUNITY_TYPES,
  COACH_AVAILABILITY,
  ORGANIZATION_TYPES,
  PROFILE_SECTIONS,
} = require('../config/constants');
const ApiError = require('../utils/ApiError');

const dateInput = z
  .union([z.string().trim(), z.date()])
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: 'Enter a valid date.',
  });

const optionalString = (max) => z.string().trim().max(max).optional();
const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Enter a valid email address.',
  })
  .optional();
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), {
    message: 'Enter a valid http(s) URL.',
  })
  .optional();
const stringList = (maxItems, maxLength) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems)
    .optional();

const locationSchema = z
  .object({
    city: optionalString(100),
    region: optionalString(100),
    country: optionalString(100),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .superRefine((location, context) => {
    const hasLat = location.latitude !== undefined;
    const hasLng = location.longitude !== undefined;
    if (hasLat !== hasLng) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['coordinates'],
        message: 'Latitude and longitude must be provided together.',
      });
    }
  })
  .optional();

const contactSchema = z
  .object({
    email: optionalEmail,
    phone: optionalString(40),
    website: optionalUrl,
    preferences: z
      .object({
        showEmail: z.boolean().optional(),
        allowMessages: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

const visibilitySchema = z
  .object(
    Object.fromEntries(
      PROFILE_SECTIONS.map((section) => [section, z.enum(VISIBILITY_VALUES).optional()]),
    ),
  )
  .optional();

const careerEntrySchema = z.object({
  organization: optionalString(160),
  role: optionalString(160),
  startDate: dateInput,
  endDate: dateInput,
  current: z.boolean().optional(),
  description: optionalString(1000),
});

const personalBestSchema = z.object({
  event: optionalString(120),
  result: optionalString(80),
  unit: optionalString(30),
  date: dateInput,
  competition: optionalString(160),
});

const certificationSchema = z.object({
  name: optionalString(160),
  issuer: optionalString(160),
  year: z.number().int().min(1900).max(2100).optional(),
});

const baseProfileShape = {
  headline: optionalString(160),
  bio: optionalString(2000),
  location: locationSchema,
  contact: contactSchema,
  visibility: visibilitySchema,
};

const athleteShape = {
  ...baseProfileShape,
  level: z.enum(ATHLETE_LEVELS).optional(),
  ageCategory: z.enum(ATHLETE_AGE_CATEGORIES).optional(),
  competitionLevel: z.enum(ATHLETE_COMPETITION_LEVELS).optional(),
  sports: stringList(12, 80),
  positions: stringList(12, 80),
  skills: stringList(ATHLETE_SKILLS_MAX, 80),
  experienceYears: z.number().min(0).max(80).optional(),
  currentTeam: optionalString(160),
  careerHistory: z.array(careerEntrySchema).max(20).optional(),
  personalBests: z.array(personalBestSchema).max(20).optional(),
  preferredOpportunities: z.array(z.enum(OPPORTUNITY_TYPES)).max(10).optional(),
  availableForTrials: z.boolean().optional(),
};

const coachShape = {
  ...baseProfileShape,
  sports: stringList(12, 80),
  specializations: stringList(12, 120),
  experienceYears: z.number().min(0).max(80).optional(),
  currentOrganization: optionalString(160),
  availability: z.enum(COACH_AVAILABILITY).optional(),
  preferredOpportunities: z.array(z.enum(OPPORTUNITY_TYPES)).max(10).optional(),
  certifications: z.array(certificationSchema).max(20).optional(),
  careerHistory: z.array(careerEntrySchema).max(20).optional(),
};

const organizationShape = {
  ...baseProfileShape,
  name: z.string().trim().min(2).max(160).optional(),
  organizationType: z.enum(ORGANIZATION_TYPES).optional(),
  sports: stringList(12, 80),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  activities: stringList(12, 120),
};

const schemasByRole = {
  [ROLES.ATHLETE]: z.object(athleteShape),
  [ROLES.COACH]: z.object(coachShape),
  [ROLES.RECRUITER]: z.object(organizationShape),
};

function validateProfileBody(req, _res, next) {
  const schema = schemasByRole[req.user?.role];

  if (!schema) {
    return next(
      ApiError.forbidden(
        'Only athlete, coach, and organization accounts can manage a public profile.',
        'PROFILE_ROLE_FORBIDDEN',
      ),
    );
  }

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(
      new ApiError(400, 'Please correct the highlighted fields.', 'VALIDATION_ERROR', errors),
    );
  }

  req.body = result.data;
  return next();
}

module.exports = {
  validateProfileBody,
  dateInput,
  optionalUrl,
};
