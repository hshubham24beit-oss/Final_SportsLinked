const mongoose = require('mongoose');
const {
  APPLICATION_STATUSES,
  APPLICATION_DOCUMENTS_MAX,
} = require('../config/constants');

const applicationDocumentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, trim: true, maxlength: 512, default: '' },
    provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    mimeType: { type: String, trim: true, maxlength: 160, default: '' },
    size: { type: Number, min: 0 },
  },
  { _id: true },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
      index: true,
    },
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coverNote: { type: String, trim: true, maxlength: 2000, default: '' },
    submittedSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    documents: {
      type: [applicationDocumentSchema],
      validate: {
        validator: (items) => items.length <= APPLICATION_DOCUMENTS_MAX,
        message: `At most ${APPLICATION_DOCUMENTS_MAX} documents can be attached`,
      },
      default: [],
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'submitted',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    reviewedAt: Date,
    decidedAt: Date,
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

applicationSchema.index({ opportunity: 1, athlete: 1 }, { unique: true });
applicationSchema.index({ athlete: 1, createdAt: -1 });
applicationSchema.index({ opportunity: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
