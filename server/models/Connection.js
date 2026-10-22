const mongoose = require('mongoose');
const { CONNECTION_STATUSES } = require('../config/constants');

function pairKeyFor(first, second) {
  return [String(first), String(second)].sort().join(':');
}

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CONNECTION_STATUSES,
      default: 'pending',
      index: true,
    },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    pairKey: { type: String, required: true, unique: true, index: true },
    respondedAt: { type: Date, default: null },
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

connectionSchema.pre('validate', function setPairKey(next) {
  if (this.requester && this.recipient) {
    this.pairKey = pairKeyFor(this.requester, this.recipient);
  }
  next();
});

connectionSchema.index({ recipient: 1, status: 1, createdAt: -1 });
connectionSchema.index({ requester: 1, status: 1, createdAt: -1 });

connectionSchema.statics.pairKey = pairKeyFor;

module.exports = mongoose.model('Connection', connectionSchema);
