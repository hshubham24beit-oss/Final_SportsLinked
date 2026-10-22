const mongoose = require('mongoose');

function pairKeyFor(first, second) {
  return [String(first), String(second)].sort().join(':');
}

const unreadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    count: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const lastMessageSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, maxlength: 4000, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (items) => Array.isArray(items) && items.length === 2,
        message: 'A conversation must have exactly two participants',
      },
      index: true,
    },
    pairKey: { type: String, required: true, unique: true, index: true },
    lastMessage: { type: lastMessageSchema, default: null },
    lastMessageAt: { type: Date, default: null, index: true },
    unreadCounts: { type: [unreadSchema], default: [] },
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

conversationSchema.pre('validate', function setPairKey(next) {
  if (this.participants?.length === 2) {
    this.pairKey = pairKeyFor(this.participants[0], this.participants[1]);
  }
  next();
});

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ 'unreadCounts.user': 1 });

conversationSchema.statics.pairKey = pairKeyFor;

module.exports = mongoose.model('Conversation', conversationSchema);
