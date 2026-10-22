const mongoose = require('mongoose');

const verificationEvidenceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationRequest',
      default: null,
      index: true,
    },
    label: { type: String, trim: true, maxlength: 160, default: '' },
    originalName: { type: String, trim: true, maxlength: 255, default: '' },
    mimeType: { type: String, trim: true, maxlength: 160, required: true },
    size: { type: Number, min: 0, required: true },
    storage: {
      provider: {
        type: String,
        enum: ['cloudinary', 'local'],
        required: true,
      },
      publicId: { type: String, trim: true, maxlength: 512, required: true },
      resourceType: {
        type: String,
        enum: ['image', 'raw'],
        default: 'raw',
      },
      deliveryType: {
        type: String,
        enum: ['authenticated'],
        default: 'authenticated',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.storage?.publicId;
        return ret;
      },
    },
  },
);

verificationEvidenceSchema.index({ owner: 1, request: 1, createdAt: -1 });

module.exports = mongoose.model('VerificationEvidence', verificationEvidenceSchema);
