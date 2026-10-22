const mongoose = require('mongoose');
const {
  POST_TYPES,
  POST_VISIBILITY_VALUES,
  POST_TEXT_MAX,
  POST_MEDIA_MAX,
} = require('../config/constants');
const { mediaRefSchema } = require('./shared');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: { type: String, trim: true, maxlength: POST_TEXT_MAX, default: '' },
    media: {
      type: [mediaRefSchema],
      validate: {
        validator: (items) => items.length <= POST_MEDIA_MAX,
        message: `A post can include at most ${POST_MEDIA_MAX} images.`,
      },
      default: [],
    },
    type: {
      type: String,
      enum: [...POST_TYPES, 'share'],
      default: 'text',
      index: true,
    },
    visibility: {
      type: String,
      enum: POST_VISIBILITY_VALUES,
      default: 'public',
      index: true,
    },
    sport: { type: String, trim: true, maxlength: 80, default: '', index: true },
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    commentCount: { type: Number, min: 0, default: 0 },
    likeCount: { type: Number, min: 0, default: 0 },
    shareCount: { type: Number, min: 0, default: 0 },
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

postSchema.pre('validate', function validateContent(next) {
  if (this.type === 'share') {
    if (!this.sharedPost) {
      this.invalidate('sharedPost', 'A shared post must reference the original post.');
    }
    return next();
  }

  if (!String(this.text || '').trim() && this.media.length === 0) {
    this.invalidate('text', 'Write something or add an image before posting.');
  }
  return next();
});

postSchema.index({ author: 1, createdAt: -1, _id: -1 });
postSchema.index({ visibility: 1, createdAt: -1, _id: -1 });
postSchema.index({ author: 1, type: 1, createdAt: -1 });
postSchema.index(
  { author: 1, sharedPost: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'share', sharedPost: { $type: 'objectId' } },
  },
);

module.exports = mongoose.model('Post', postSchema);
