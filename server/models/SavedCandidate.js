const mongoose = require('mongoose');

const savedCandidateSchema = new mongoose.Schema(
  {
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

savedCandidateSchema.index({ savedBy: 1, athlete: 1 }, { unique: true });
savedCandidateSchema.index({ savedBy: 1, createdAt: -1 });

module.exports = mongoose.model('SavedCandidate', savedCandidateSchema);
