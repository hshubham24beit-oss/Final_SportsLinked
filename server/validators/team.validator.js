const { z } = require('zod');
const {
  TEAM_TYPES,
  TEAM_PRIVACY_VALUES,
  TEAM_MEMBER_ROLES,
  TEAM_UPDATE_MAX,
} = require('../config/constants');

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

const teamShape = {
  name: z.string().trim().min(2, 'Enter a team or group name.').max(120),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the team or group in at least 10 characters.')
    .max(4000),
  sport: z.string().trim().min(1, 'Enter a sport.').max(80),
  type: z.enum(TEAM_TYPES).optional(),
  privacy: z.enum(TEAM_PRIVACY_VALUES).optional(),
  location: locationInput,
};

const teamCreateSchema = z.object(teamShape);
const teamUpdateSchema = z.object(teamShape).partial();

const teamListQuerySchema = z.object({
  q: optionalText(120),
  sport: optionalText(80),
  location: optionalText(100),
  type: z.enum(TEAM_TYPES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const teamInviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    userId: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{24}$/i, 'Enter a valid member identifier.')
      .optional(),
    role: z.enum(['manager', 'coach', 'member']).optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.userId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Enter the email of the member you want to invite.',
      });
    }
  });

const teamInvitationResponseSchema = z.object({
  accept: z.boolean(),
});

const teamMemberRoleSchema = z.object({
  role: z.enum(TEAM_MEMBER_ROLES.filter((role) => role !== 'owner')),
});

const teamUpdateCreateSchema = z.object({
  text: z.string().trim().min(1, 'Write an update.').max(TEAM_UPDATE_MAX),
});

module.exports = {
  teamCreateSchema,
  teamUpdateSchema,
  teamListQuerySchema,
  teamInviteSchema,
  teamInvitationResponseSchema,
  teamMemberRoleSchema,
  teamUpdateCreateSchema,
};
