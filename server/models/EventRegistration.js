const mongoose = require('mongoose');
const { EVENT_REGISTRATION_STATUSES } = require('../config/constants');

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: EVENT_REGISTRATION_STATUSES,
      required: true,
      default: 'registered',
      index: true,
    },
    registeredAt: { type: Date, default: Date.now },
    cancelledAt: Date,
    promotedAt: Date,
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

eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });
eventRegistrationSchema.index({ event: 1, status: 1, createdAt: 1 });
eventRegistrationSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
