const mongoose = require('mongoose');
const {
  TEAM_TYPES,
  TEAM_PRIVACY_VALUES,
  TEAM_MEMBER_ROLES,
  TEAM_UPDATE_MAX,
} = require('../config/constants');
const { locationSchema } = require('./shared');

const teamUpdateSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: { type: String, required: true, trim: true, maxlength: 160 },
    authorRole: {
      type: String,
      enum: TEAM_MEMBER_ROLES,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: TEAM_UPDATE_MAX,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const teamSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerName: { type: String, required: true, trim: true, maxlength: 160 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 4000,
    },
    sport: { type: String, required: true, trim: true, maxlength: 80, index: true },
    type: { type: String, enum: TEAM_TYPES, default: 'team', index: true },
    privacy: {
      type: String,
      enum: TEAM_PRIVACY_VALUES,
      default: 'public',
      index: true,
    },
    location: { type: locationSchema, default: () => ({}) },
    memberCount: { type: Number, min: 0, default: 1 },
    updates: {
      type: [teamUpdateSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 50,
        message: 'A team can store at most 50 recent updates',
      },
    },
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

teamSchema.index({ privacy: 1, sport: 1, 'location.city': 1 });
teamSchema.index({ owner: 1, updatedAt: -1 });
teamSchema.index(
  { name: 'text', description: 'text', sport: 'text', 'location.city': 'text' },
  {
    name: 'team_search_text',
    weights: { name: 8, sport: 5, 'location.city': 3, description: 1 },
  },
);

module.exports = mongoose.model('Team', teamSchema);
