const { z } = require('zod');
const {
  ATHLETE_LEVELS,
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_COMPETITION_LEVELS,
  OPPORTUNITY_CATEGORIES,
} = require('../config/constants');

const toneSchema = z
  .enum(['professional', 'concise', 'confident', 'enthusiastic', 'reflective'])
  .default('professional');

const optionalText = (max) => z.string().trim().max(max).optional();

const profileSuggestionSchema = z
  .object({
    headline: optionalText(160),
    bio: optionalText(2000),
    sports: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    positions: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    experienceYears: z.coerce.number().min(0).max(80).optional(),
    currentTeam: optionalText(160),
    location: z
      .object({
        city: optionalText(100),
        region: optionalText(100),
        country: optionalText(100),
      })
      .optional(),
    highlights: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
    tone: toneSchema.optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.headline?.trim() ||
          value.bio?.trim() ||
          value.sports?.length ||
          value.positions?.length ||
          value.highlights?.length ||
          value.currentTeam?.trim(),
      ),
    {
      message: 'Add some profile details before generating a suggestion.',
      path: ['bio'],
    },
  );

const achievementDraftSchema = z.object({
  title: optionalText(160),
  competition: optionalText(160),
  result: optionalText(160),
  date: z
    .union([z.string().trim(), z.date()])
    .optional()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
      message: 'Enter a valid achievement date.',
    }),
});

const contentDraftSchema = z
  .object({
    kind: z.enum(['post', 'achievement']),
    topic: optionalText(300),
    details: optionalText(3000),
    sport: optionalText(80),
    tone: toneSchema.optional(),
    achievement: achievementDraftSchema.optional(),
  })
  .refine(
    (value) =>
      value.kind === 'post'
        ? Boolean(value.topic?.trim() || value.details?.trim())
        : Boolean(value.topic?.trim() || value.achievement?.title?.trim()),
    {
      message: 'Add a topic or achievement title before generating a draft.',
      path: ['topic'],
    },
  );

const opportunityMatchSchema = z.object({
  sport: optionalText(80),
  positions: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  location: optionalText(200),
  experienceYears: z.coerce.number().min(0).max(80).optional(),
  level: z.enum(ATHLETE_LEVELS).optional(),
  competitionLevel: z.enum(ATHLETE_COMPETITION_LEVELS).optional(),
  ageCategory: z.enum(ATHLETE_AGE_CATEGORIES).optional(),
  preferredTypes: z.array(z.enum(OPPORTUNITY_CATEGORIES)).max(8).optional(),
});

module.exports = {
  profileSuggestionSchema,
  contentDraftSchema,
  opportunityMatchSchema,
};
