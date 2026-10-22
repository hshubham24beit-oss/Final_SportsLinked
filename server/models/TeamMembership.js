const mongoose = require('mongoose');
const {
  TEAM_MEMBER_ROLES,
  TEAM_MEMBER_STATUSES,
} = require('../config/constants');

const teamMembershipSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: TEAM_MEMBER_ROLES,
      default: 'member',
      required: true,
    },
    status: {
      type: String,
      enum: TEAM_MEMBER_STATUSES,
      default: 'invited',
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: Date,
    joinedAt: Date,
    removedAt: Date,
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

teamMembershipSchema.index({ team: 1, user: 1 }, { unique: true });
teamMembershipSchema.index({ team: 1, status: 1, role: 1 });
teamMembershipSchema.index({ user: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('TeamMembership', teamMembershipSchema);
