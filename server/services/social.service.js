const mongoose = require('mongoose');
const User = require('../models/User');
const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const { ROLES, USER_STATUS } = require('../config/constants');

const PROFILE_MODELS = [AthleteProfile, CoachProfile, Organization];

function emptyLocation(location) {
  return {
    city: location?.city || '',
    region: location?.region || '',
    country: location?.country || '',
  };
}

function profileDisplayName(user, profile) {
  if (user.role === ROLES.RECRUITER) {
    return profile?.name || user.name;
  }
  return user.name;
}

async function getUserSummaryMap(ids = []) {
  const uniqueIds = [...new Set(ids.map((id) => String(id)))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const users = await User.find({
    _id: { $in: uniqueIds },
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  })
    .select('name role status')
    .lean();

  const profileResults = await Promise.all(
    PROFILE_MODELS.map((Model) =>
      Model.find({ user: { $in: uniqueIds } })
        .select('user slug name headline avatar sports location')
        .lean(),
    ),
  );

  const profileByUser = new Map();
  for (const profile of profileResults.flat()) {
    profileByUser.set(String(profile.user), profile);
  }

  return new Map(
    users.map((entry) => {
      const profile = profileByUser.get(String(entry._id));
      return [
        String(entry._id),
        {
          id: String(entry._id),
          name: profileDisplayName(entry, profile),
          accountName: entry.name,
          role: entry.role,
          status: entry.status,
          slug: profile?.slug || null,
          headline: profile?.headline || '',
          avatarUrl: profile?.avatar?.url || null,
          sports: profile?.sports || [],
          location: emptyLocation(profile?.location),
        },
      ];
    }),
  );
}

async function getTargetUser(targetUserId, { allowAdmin = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }

  const target = await User.findById(targetUserId).select('name role status');
  if (!target) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  if (target.role === ROLES.ADMIN && !allowAdmin) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  if (![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(target.status)) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }

  return target;
}

async function getUserProfile(user) {
  const model = {
    [ROLES.ATHLETE]: AthleteProfile,
    [ROLES.COACH]: CoachProfile,
    [ROLES.RECRUITER]: Organization,
  }[user.role];

  if (!model) {
    return null;
  }
  return model.findOne({ user: user._id }).lean();
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

module.exports = {
  getUserSummaryMap,
  getTargetUser,
  getUserProfile,
  emptyLocation,
  lower,
  PROFILE_MODELS,
};
