const mongoose = require('mongoose');
const {
  VISIBILITY_VALUES,
  VISIBILITY_DEFAULTS,
  PROFILE_SECTIONS,
} = require('../config/constants');

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      validate: {
        validator(value) {
          return value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
        },
        message: 'Coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    city: { type: String, trim: true, maxlength: 100, default: '' },
    region: { type: String, trim: true, maxlength: 100, default: '' },
    country: { type: String, trim: true, maxlength: 100, default: '' },
    coordinates: { type: pointSchema, default: undefined },
  },
  { _id: false },
);

const mediaRefSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, trim: true, maxlength: 512, default: '' },
    provider: { type: String, enum: ['cloudinary', 'local', 'external'], default: 'external' },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
  { _id: false },
);

const galleryItemSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  publicId: { type: String, trim: true, maxlength: 512, default: '' },
  provider: { type: String, enum: ['cloudinary', 'local', 'external'], default: 'external' },
  width: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
  caption: { type: String, trim: true, maxlength: 200, default: '' },
});

const contactPreferencesSchema = new mongoose.Schema(
  {
    showEmail: { type: Boolean, default: false },
    allowMessages: { type: Boolean, default: true },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    website: { type: String, trim: true, maxlength: 500, default: '' },
    preferences: { type: contactPreferencesSchema, default: () => ({}) },
  },
  { _id: false },
);

const visibilityFields = {};
for (const section of PROFILE_SECTIONS) {
  visibilityFields[section] = {
    type: String,
    enum: VISIBILITY_VALUES,
    default: VISIBILITY_DEFAULTS[section],
  };
}
const visibilitySchema = new mongoose.Schema(visibilityFields, { _id: false });

const careerEntrySchema = new mongoose.Schema(
  {
    organization: { type: String, trim: true, maxlength: 160, default: '' },
    role: { type: String, trim: true, maxlength: 160, default: '' },
    startDate: Date,
    endDate: Date,
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: true },
);

const personalBestSchema = new mongoose.Schema(
  {
    event: { type: String, trim: true, maxlength: 120, default: '' },
    result: { type: String, trim: true, maxlength: 80, default: '' },
    unit: { type: String, trim: true, maxlength: 30, default: '' },
    date: Date,
    competition: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { _id: true },
);

const statisticSchema = new mongoose.Schema(
  {
    metric: { type: String, required: true, trim: true, maxlength: 120 },
    value: { type: Number, required: true, min: -1000000, max: 1000000 },
    unit: { type: String, trim: true, maxlength: 30, default: '' },
    date: Date,
  },
  { _id: true },
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 160, default: '' },
    issuer: { type: String, trim: true, maxlength: 160, default: '' },
    year: { type: Number, min: 1900, max: 2100 },
  },
  { _id: true },
);

const profileTransform = (_doc, ret) => {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
};

const profileSchemaOptions = {
  timestamps: true,
  toJSON: { transform: profileTransform },
};

const baseProfileFields = {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 80,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  headline: { type: String, trim: true, maxlength: 160, default: '' },
  bio: { type: String, trim: true, maxlength: 2000, default: '' },
  location: { type: locationSchema, default: () => ({}) },
  contact: { type: contactSchema, default: () => ({}) },
  visibility: { type: visibilitySchema, default: () => ({ ...VISIBILITY_DEFAULTS }) },
  avatar: { type: mediaRefSchema, default: undefined },
  cover: { type: mediaRefSchema, default: undefined },
  mediaGallery: { type: [galleryItemSchema], default: [] },
  profileCompletion: { type: Number, min: 0, max: 100, default: 0 },
};

const withBaseFields = (fields = {}) => new mongoose.Schema({ ...baseProfileFields, ...fields }, profileSchemaOptions);

module.exports = {
  locationSchema,
  mediaRefSchema,
  galleryItemSchema,
  contactSchema,
  visibilitySchema,
  careerEntrySchema,
  personalBestSchema,
  statisticSchema,
  certificationSchema,
  profileTransform,
  profileSchemaOptions,
  baseProfileFields,
  withBaseFields,
};
