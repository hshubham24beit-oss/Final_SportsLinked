const Follow = require('../models/Follow');
const ApiError = require('../utils/ApiError');
const blockService = require('./block.service');
const { getUserSummaryMap, getTargetUser } = require('./social.service');
const { ROLES } = require('../config/constants');

function clampLimit(value, fallback = 50, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

async function followCounts(userId) {
  const [followerCount, followingCount] = await Promise.all([
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
  ]);
  return { followerCount, followingCount };
}

async function followUser(user, targetUserId) {
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Administrator accounts cannot follow members.',
      'FOLLOW_ADMIN_FORBIDDEN',
    );
  }
  if (String(user._id) === String(targetUserId)) {
    throw ApiError.badRequest('You cannot follow yourself.', 'FOLLOW_SELF');
  }

  const target = await getTargetUser(targetUserId);
  await blockService.assertNotBlocked(user._id, target._id);

  try {
    await Follow.updateOne(
      { follower: user._id, following: target._id },
      { $setOnInsert: { follower: user._id, following: target._id } },
      { upsert: true },
    );
  } catch (error) {
    if (!error || error.code !== 11000) {
      throw error;
    }
  }

  return { userId: String(target._id), isFollowing: true, ...(await followCounts(target._id)) };
}

async function unfollowUser(user, targetUserId) {
  if (!targetUserId) {
    throw ApiError.badRequest('Choose an account to unfollow.', 'FOLLOW_TARGET_REQUIRED');
  }

  await Follow.deleteOne({ follower: user._id, following: targetUserId });
  const counts = await followCounts(targetUserId);
  return { userId: String(targetUserId), isFollowing: false, ...counts };
}

async function listFollowers(targetUserId, query = {}) {
  const target = await getTargetUser(targetUserId);
  const limit = clampLimit(query.limit);
  const records = await Follow.find({ following: target._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  const summaries = await getUserSummaryMap(records.map((record) => record.follower));

  return {
    users: records
      .map((record) => {
        const user = summaries.get(String(record.follower));
        return user ? { ...user, followedAt: record.createdAt } : null;
      })
      .filter(Boolean),
    total: await Follow.countDocuments({ following: target._id }),
  };
}

async function listFollowing(targetUserId, query = {}) {
  const target = await getTargetUser(targetUserId);
  const limit = clampLimit(query.limit);
  const records = await Follow.find({ follower: target._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  const summaries = await getUserSummaryMap(records.map((record) => record.following));

  return {
    users: records
      .map((record) => {
        const user = summaries.get(String(record.following));
        return user ? { ...user, followedAt: record.createdAt } : null;
      })
      .filter(Boolean),
    total: await Follow.countDocuments({ follower: target._id }),
  };
}

async function getRelationship(viewer, targetUserId) {
  const [counts, isFollowing, followedBy] = await Promise.all([
    followCounts(targetUserId),
    viewer && String(viewer._id) !== String(targetUserId)
      ? Follow.exists({ follower: viewer._id, following: targetUserId })
      : false,
    viewer && String(viewer._id) !== String(targetUserId)
      ? Follow.exists({ follower: targetUserId, following: viewer._id })
      : false,
  ]);

  return {
    ...counts,
    isFollowing: Boolean(isFollowing),
    followedBy: Boolean(followedBy),
  };
}

async function removeFollowsBetween(firstUserId, secondUserId) {
  await Follow.deleteMany({
    $or: [
      { follower: firstUserId, following: secondUserId },
      { follower: secondUserId, following: firstUserId },
    ],
  });
}

module.exports = {
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing,
  getRelationship,
  followCounts,
  removeFollowsBetween,
};
