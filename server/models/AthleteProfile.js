const mongoose = require('mongoose');
const {
  ATHLETE_LEVELS,
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_COMPETITION_LEVELS,
  ATHLETE_SKILLS_MAX,
  OPPORTUNITY_TYPES,
  STATISTIC_MAX,
} = require('../config/constants');
const {
  withBaseFields,
  careerEntrySchema,
  personalBestSchema,
  statisticSchema,
} = require('./shared');

const athleteProfileSchema = withBaseFields({
  level: { type: String, enum: ATHLETE_LEVELS, default: 'amateur' },
  ageCategory: { type: String, enum: ATHLETE_AGE_CATEGORIES, default: undefined },
  competitionLevel: {
    type: String,
    enum: ATHLETE_COMPETITION_LEVELS,
    default: undefined,
  },
  sports: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
  positions: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
  skills: {
    type: [{ type: String, trim: true, maxlength: 80 }],
    validate: {
      validator: (items) => items.length <= ATHLETE_SKILLS_MAX,
      message: `A profile can have at most ${ATHLETE_SKILLS_MAX} skills`,
    },
    default: [],
  },
  experienceYears: { type: Number, min: 0, max: 80 },
  currentTeam: { type: String, trim: true, maxlength: 160, default: '' },
  careerHistory: { type: [careerEntrySchema], default: [] },
  personalBests: { type: [personalBestSchema], default: [] },
  preferredOpportunities: {
    type: [{ type: String, enum: OPPORTUNITY_TYPES }],
    default: [],
  },
  availableForTrials: { type: Boolean, default: false },
  statistics: {
    type: [statisticSchema],
    validate: {
      validator: (items) => items.length <= STATISTIC_MAX,
      message: `A profile can have at most ${STATISTIC_MAX} statistics`,
    },
    default: [],
  },
});

athleteProfileSchema.index({ 'location.coordinates': '2dsphere' });
athleteProfileSchema.index({ sports: 1 });
athleteProfileSchema.index(
  {
    sports: 'text',
    positions: 'text',
    currentTeam: 'text',
    skills: 'text',
  },
  {
    name: 'athlete_discovery_text',
    weights: { sports: 8, positions: 5, skills: 4, currentTeam: 2 },
  },
);
athleteProfileSchema.index({ sports: 1, availableForTrials: 1, profileCompletion: -1 });
athleteProfileSchema.index({
  ageCategory: 1,
  competitionLevel: 1,
  level: 1,
  experienceYears: -1,
});
athleteProfileSchema.index({ 'location.city': 1, 'location.country': 1 });
athleteProfileSchema.index({ 'visibility.sports': 1, 'visibility.bio': 1, updatedAt: -1 });

module.exports = mongoose.model('AthleteProfile', athleteProfileSchema);
