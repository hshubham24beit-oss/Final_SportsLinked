const mongoose = require('mongoose');
const {
  VERIFICATION_TYPES,
  VERIFICATION_STATUSES,
  VERIFICATION_DECISIONS,
} = require('../config/constants');

const officialLinkSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    label: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { _id: false },
);

const qualificationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 160, default: '' },
    issuer: { type: String, trim: true, maxlength: 160, default: '' },
    year: { type: Number, min: 1900, max: 2100 },
    officialUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  },
  { _id: false },
);

const verificationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: VERIFICATION_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'requested',
      index: true,
    },
    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      default: null,
      index: true,
    },
    qualification: { type: qualificationSchema, default: () => ({}) },
    statement: { type: String, trim: true, maxlength: 2000, default: '' },
    evidence: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VerificationEvidence',
      },
    ],
    officialLinks: { type: [officialLinkSchema], default: [] },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    decision: {
      type: String,
      enum: [...VERIFICATION_DECISIONS, null],
      default: null,
    },
    reason: { type: String, trim: true, maxlength: 2000, default: '' },
    submittedAt: { type: Date, default: Date.now },
    claimedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    expiredAt: { type: Date, default: null },
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

verificationRequestSchema.index({ user: 1, type: 1, status: 1, createdAt: -1 });
verificationRequestSchema.index({ status: 1, submittedAt: 1, _id: 1 });
verificationRequestSchema.index({ achievement: 1, status: 1 });
verificationRequestSchema.index({ reviewer: 1, status: 1 });
verificationRequestSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
