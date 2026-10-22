const mongoose = require('mongoose');
const {
  ACHIEVEMENT_VERIFICATION_STATUS,
  ACHIEVEMENT_EVIDENCE_MAX,
} = require('../config/constants');

const evidenceRefSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    label: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { _id: false },
);

const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    sport: { type: String, required: true, trim: true, maxlength: 80 },
    competition: { type: String, trim: true, maxlength: 160, default: '' },
    result: { type: String, trim: true, maxlength: 160, default: '' },
    date: Date,
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    evidenceRefs: {
      type: [evidenceRefSchema],
      validate: {
        validator: (items) => items.length <= ACHIEVEMENT_EVIDENCE_MAX,
        message: `At most ${ACHIEVEMENT_EVIDENCE_MAX} evidence references are allowed`,
      },
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ACHIEVEMENT_VERIFICATION_STATUS,
      default: 'unverified',
      index: true,
    },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

achievementSchema.index({ user: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('Achievement', achievementSchema);
