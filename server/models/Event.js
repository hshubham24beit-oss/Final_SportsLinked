const mongoose = require('mongoose');
const {
  EVENT_TYPES,
  EVENT_STATUSES,
  EVENT_CAPACITY_MAX,
  EVENT_CANCELLATION_REASON_MAX,
  ROLES,
} = require('../config/constants');
const { locationSchema } = require('./shared');

const eventVenueSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 160, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    location: { type: locationSchema, default: () => ({}) },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizerName: { type: String, required: true, trim: true, maxlength: 160 },
    organizerRole: {
      type: String,
      enum: [ROLES.ATHLETE, ROLES.COACH, ROLES.RECRUITER],
      required: true,
    },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },
    sport: { type: String, required: true, trim: true, maxlength: 80, index: true },
    type: { type: String, enum: EVENT_TYPES, default: 'community', index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true, index: true },
    venue: { type: eventVenueSchema, default: () => ({}) },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: EVENT_CAPACITY_MAX,
    },
    allowWaitlist: { type: Boolean, default: true },
    registrationCount: { type: Number, min: 0, default: 0 },
    waitlistCount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'draft',
      index: true,
    },
    publishedAt: Date,
    cancelledAt: Date,
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: EVENT_CANCELLATION_REASON_MAX,
      default: '',
    },
    completedAt: Date,
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

eventSchema.pre('validate', function validateSchedule(next) {
  if (this.startAt && this.endAt && this.endAt < this.startAt) {
    this.invalidate('endAt', 'The event end must be on or after its start.');
  }
  if (
    this.registrationDeadline &&
    this.startAt &&
    this.registrationDeadline > this.startAt
  ) {
    this.invalidate(
      'registrationDeadline',
      'Registration must close no later than the event start.',
    );
  }
  next();
});

eventSchema.index({ status: 1, startAt: 1 });
eventSchema.index({ status: 1, sport: 1, startAt: 1 });
eventSchema.index({ organizer: 1, status: 1, startAt: -1 });
eventSchema.index({ 'venue.location.city': 1, 'venue.location.country': 1 });
eventSchema.index(
  { title: 'text', description: 'text', sport: 'text', 'venue.name': 'text' },
  {
    name: 'event_search_text',
    weights: { title: 8, sport: 5, 'venue.name': 3, description: 1 },
  },
);

module.exports = mongoose.model('Event', eventSchema);
