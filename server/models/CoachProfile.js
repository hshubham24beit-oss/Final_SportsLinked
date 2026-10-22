const mongoose = require('mongoose');
const {
  COACH_AVAILABILITY,
  OPPORTUNITY_TYPES,
} = require('../config/constants');
const {
  withBaseFields,
  careerEntrySchema,
  certificationSchema,
} = require('./shared');

const coachProfileSchema = withBaseFields({
  sports: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
  specializations: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  experienceYears: { type: Number, min: 0, max: 80 },
  currentOrganization: { type: String, trim: true, maxlength: 160, default: '' },
  availability: { type: String, enum: COACH_AVAILABILITY, default: 'open_to_roles' },
  preferredOpportunities: {
    type: [{ type: String, enum: OPPORTUNITY_TYPES }],
    default: [],
  },
  certifications: { type: [certificationSchema], default: [] },
  careerHistory: { type: [careerEntrySchema], default: [] },
});

coachProfileSchema.index({ 'location.coordinates': '2dsphere' });
coachProfileSchema.index({ sports: 1 });

module.exports = mongoose.model('CoachProfile', coachProfileSchema);
