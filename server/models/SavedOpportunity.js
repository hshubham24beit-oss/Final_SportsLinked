const mongoose = require('mongoose');

const savedOpportunitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
      index: true,
    },
    reminderSentAt: { type: Date, default: null, index: true },
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

savedOpportunitySchema.index({ user: 1, opportunity: 1 }, { unique: true });
savedOpportunitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedOpportunity', savedOpportunitySchema);
