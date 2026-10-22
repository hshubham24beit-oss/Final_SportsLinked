const mongoose = require('mongoose');
const {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
  ATHLETE_LEVELS,
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_COMPETITION_LEVELS,
  OPPORTUNITY_REQUIRED_DOCUMENTS_MAX,
  ROLES,
} = require('../config/constants');
const { locationSchema } = require('./shared');

const eligibilitySchema = new mongoose.Schema(
  {
    ageCategories: {
      type: [{ type: String, enum: ATHLETE_AGE_CATEGORIES }],
      default: [],
    },
    competitionLevels: {
      type: [{ type: String, enum: ATHLETE_COMPETITION_LEVELS }],
      default: [],
    },
    levels: {
      type: [{ type: String, enum: ATHLETE_LEVELS }],
      default: [],
    },
    minExperienceYears: { type: Number, min: 0, max: 80 },
    maxExperienceYears: { type: Number, min: 0, max: 80 },
    requiresVerifiedAchievement: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { _id: false },
);

const opportunitySchema = new mongoose.Schema(
  {
    publisher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publisherName: { type: String, required: true, trim: true, maxlength: 160 },
    publisherRole: { type: String, enum: [ROLES.COACH, ROLES.RECRUITER], required: true },
    type: { type: String, enum: OPPORTUNITY_CATEGORIES, required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 10000 },
    sport: { type: String, required: true, trim: true, maxlength: 80, index: true },
    positions: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      validate: {
        validator: (items) => items.length <= 20,
        message: 'At most 20 positions can be listed',
      },
      default: [],
    },
    eligibility: { type: eligibilitySchema, default: () => ({}) },
    location: { type: locationSchema, default: () => ({}) },
    eventStartDate: Date,
    eventEndDate: Date,
    deadline: { type: Date, required: true, index: true },
    requiredDocuments: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      validate: {
        validator: (items) => items.length <= OPPORTUNITY_REQUIRED_DOCUMENTS_MAX,
        message: `At most ${OPPORTUNITY_REQUIRED_DOCUMENTS_MAX} required documents can be listed`,
      },
      default: [],
    },
    positionsAvailable: { type: Number, min: 1, max: 10000, default: 1 },
    contactInstructions: { type: String, trim: true, maxlength: 2000, default: '' },
    status: {
      type: String,
      enum: OPPORTUNITY_STATUSES,
      default: 'draft',
      index: true,
    },
    publishedAt: Date,
    closedAt: Date,
    expiredAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

opportunitySchema.index({ status: 1, deadline: 1 });
opportunitySchema.index({ status: 1, type: 1, sport: 1, deadline: 1 });
opportunitySchema.index({ publisher: 1, status: 1, updatedAt: -1 });
opportunitySchema.index(
  { title: 'text', description: 'text', sport: 'text', positions: 'text' },
  {
    name: 'opportunity_search_text',
    weights: { title: 8, sport: 5, positions: 3, description: 1 },
  },
);
opportunitySchema.index({ 'location.city': 1, 'location.country': 1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);
