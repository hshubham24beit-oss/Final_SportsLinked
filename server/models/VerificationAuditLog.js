const mongoose = require('mongoose');

const verificationAuditLogSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationRequest',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      enum: [
        'submitted',
        'resubmitted',
        'claimed',
        'approved',
        'rejected',
        'expired',
        'evidence_accessed',
      ],
      required: true,
    },
    fromStatus: { type: String, trim: true, maxlength: 40, default: '' },
    toStatus: { type: String, trim: true, maxlength: 40, default: '' },
    reason: { type: String, trim: true, maxlength: 2000, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

verificationAuditLogSchema.index({ request: 1, createdAt: 1 });
verificationAuditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('VerificationAuditLog', verificationAuditLogSchema);
