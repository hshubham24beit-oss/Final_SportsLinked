const mongoose = require('mongoose');
const Block = require('../models/Block');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

async function getBlockedUserIds(viewerId) {
  const records = await Block.find({
    $or: [{ blocker: viewerId }, { blocked: viewerId }],
  })
    .select('blocker blocked')
    .lean();

  return records.map((record) =>
    String(record.blocker) === String(viewerId) ? record.blocked : record.blocker,
  );
}

async function hasBlockedRelation(firstUserId, secondUserId) {
  if (!firstUserId || !secondUserId) {
    return false;
  }
  return Boolean(
    await Block.exists({
      $or: [
        { blocker: firstUserId, blocked: secondUserId },
        { blocker: secondUserId, blocked: firstUserId },
      ],
    }),
  );
}

async function assertNotBlocked(firstUserId, secondUserId) {
  if (await hasBlockedRelation(firstUserId, secondUserId)) {
    throw ApiError.notFound('That resource could not be found.', 'BLOCKED_RELATION');
  }
}

async function listBlockedUsers(user) {
  const records = await Block.find({ blocker: user._id })
    .sort({ createdAt: -1 })
    .populate('blocked', 'name email role status')
    .lean();

  return records
    .filter((record) => record.blocked)
    .map((record) => ({
      id: record._id.toString(),
      user: {
        id: record.blocked._id.toString(),
        name: record.blocked.name,
        role: record.blocked.role,
        status: record.blocked.status,
      },
      reason: record.reason || '',
      createdAt: record.createdAt,
    }));
}

async function blockUser(user, targetUserId, reason = '') {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  if (String(user._id) === String(targetUserId)) {
    throw ApiError.badRequest('You cannot block your own account.', 'BLOCK_SELF');
  }
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden('Administrators cannot block accounts.', 'BLOCK_ADMIN_FORBIDDEN');
  }

  const target = await User.findById(targetUserId).select('name role status');
  if (!target) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  if (target.role === ROLES.ADMIN) {
    throw ApiError.forbidden('Administrator accounts cannot be blocked.', 'BLOCK_ADMIN_FORBIDDEN');
  }

  await Block.findOneAndUpdate(
    { blocker: user._id, blocked: target._id },
    { $setOnInsert: { blocker: user._id, blocked: target._id, reason: reason.trim() } },
    { upsert: true, new: true },
  );

  await Promise.all([
    Connection.deleteMany({ pairKey: Connection.pairKey(user._id, target._id) }),
    Follow.deleteMany({
      $or: [
        { follower: user._id, following: target._id },
        { follower: target._id, following: user._id },
      ],
    }),
  ]);

  return { userId: String(target._id), blocked: true };
}

async function unblockUser(user, targetUserId) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  await Block.deleteOne({ blocker: user._id, blocked: targetUserId });
  return { userId: targetUserId, blocked: false };
}

module.exports = {
  getBlockedUserIds,
  hasBlockedRelation,
  assertNotBlocked,
  listBlockedUsers,
  blockUser,
  unblockUser,
};
