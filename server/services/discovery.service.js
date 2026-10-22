const mongoose = require('mongoose');
const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Organization = require('../models/Organization');
const Achievement = require('../models/Achievement');
const SavedCandidate = require('../models/SavedCandidate');
const BlockedUser = require('../models/BlockedUser');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES, USER_STATUS } = require('../config/constants');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsRegex(value) {
  return new RegExp(escapeRegex(value), 'i');
}

function sectionIsVisible(profile, section) {
  return (profile.visibility?.[section] || 'public') !== 'private';
}

async function getBlockedUserIds(viewerId) {
  const records = await BlockedUser.find({
    $or: [{ blocker: viewerId }, { blocked: viewerId }],
  })
    .select('blocker blocked')
    .lean();

  return records.map((record) =>
    String(record.blocker) === String(viewerId) ? record.blocked : record.blocker,
  );
}

async function getNearbyCenter(viewer) {
  if (viewer.role === ROLES.COACH) {
    const profile = await CoachProfile.findOne({ user: viewer._id }).select('location').lean();
    return profile?.location?.coordinates?.coordinates || null;
  }

  if (viewer.role === ROLES.RECRUITER) {
    const profile = await Organization.findOne({ user: viewer._id }).select('location').lean();
    return profile?.location?.coordinates?.coordinates || null;
  }

  return null;
}

async function buildAthleteFilter(viewer, query) {
  const blockedIds = await getBlockedUserIds(viewer._id);
  const userQuery = {
    role: ROLES.ATHLETE,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
    onboardingCompleted: true,
  };
  if (blockedIds.length > 0) {
    userQuery._id = { $nin: blockedIds };
  }

  const activeIds = await User.find(userQuery).distinct('_id');
  if (activeIds.length === 0) {
    return null;
  }

  const filter = {
    user: { $in: activeIds },
    'visibility.sports': { $ne: 'private' },
  };
  const conditions = [];

  if (query.q) {
    const nameMatches = await User.find({
      _id: { $in: activeIds },
      name: containsRegex(query.q),
    }).distinct('_id');

    conditions.push({
      $or: [{ $text: { $search: query.q } }, { user: { $in: nameMatches } }],
    });
  }

  if (query.sport) {
    filter.sports = containsRegex(query.sport);
  }
  if (query.position) {
    filter.positions = containsRegex(query.position);
  }
  if (query.skill) {
    filter.skills = containsRegex(query.skill);
  }
  if (query.team) {
    filter.currentTeam = containsRegex(query.team);
  }
  if (query.ageCategory) {
    filter.ageCategory = query.ageCategory;
  }
  if (query.level) {
    filter.level = query.level;
  }
  if (query.competitionLevel) {
    filter.competitionLevel = query.competitionLevel;
  }

  if (query.location) {
    const locationMatcher = containsRegex(query.location);
    conditions.push({
      $or: [
        { 'location.city': locationMatcher },
        { 'location.region': locationMatcher },
        { 'location.country': locationMatcher },
      ],
    });
    filter['visibility.location'] = { $ne: 'private' };
  }

  if (query.lat !== undefined && query.lng !== undefined) {
    filter['location.coordinates'] = {
      $geoWithin: {
        $centerSphere: [
          [query.lng, query.lat],
          (query.radiusKm || 50) / 6378.1,
        ],
      },
    };
    filter['visibility.location'] = { $ne: 'private' };
  }

  if (query.nearMe) {
    const center = await getNearbyCenter(viewer);
    if (!center) {
      throw ApiError.badRequest(
        'Add map coordinates to your profile before searching near your location.',
        'NEARBY_LOCATION_UNAVAILABLE',
      );
    }

    filter['location.coordinates'] = {
      $geoWithin: {
        $centerSphere: [center, (query.radiusKm || 50) / 6378.1],
      },
    };
    filter['visibility.location'] = { $ne: 'private' };
  }

  if (query.availableForTrials) {
    filter.availableForTrials = true;
    filter['visibility.contact'] = { $ne: 'private' };
  }

  if (query.statMetric) {
    const metric = containsRegex(query.statMetric);
    const range = {};
    if (query.statMin !== undefined) {
      range.$gte = query.statMin;
    }
    if (query.statMax !== undefined) {
      range.$lte = query.statMax;
    }
    filter.statistics = {
      $elemMatch: {
        metric,
        ...(Object.keys(range).length > 0 ? { value: range } : {}),
      },
    };
    filter['visibility.statistics'] = { $ne: 'private' };
  }

  if (query.achievements === 'any' || query.verification === 'verified') {
    const achievementFilter = { user: { $in: activeIds } };
    if (query.verification === 'verified') {
      achievementFilter.verificationStatus = 'verified';
    }

    const achievementUserIds = await Achievement.distinct('user', achievementFilter);
    const activeIdSet = new Set(activeIds.map(String));
    filter.user = {
      $in: achievementUserIds.filter((userId) => activeIdSet.has(String(userId))),
    };
    filter['visibility.achievements'] = { $ne: 'private' };
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  return filter;
}

function getSortSpec(query) {
  if (query.sort === 'completion') {
    return { profileCompletion: -1, updatedAt: -1 };
  }
  if (query.sort === 'experience') {
    return { experienceYears: -1, profileCompletion: -1, updatedAt: -1 };
  }
  if (query.sort === 'recent') {
    return { updatedAt: -1, profileCompletion: -1 };
  }
  return null;
}

async function getAchievementCounts(userIds) {
  if (userIds.length === 0) {
    return new Map();
  }

  const counts = await Achievement.aggregate([
    {
      $match: {
        user: { $in: userIds },
        verificationStatus: 'verified',
      },
    },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);

  return new Map(counts.map((item) => [String(item._id), item.count]));
}

async function getSavedIds(viewerId, userIds) {
  if (userIds.length === 0) {
    return new Set();
  }

  const records = await SavedCandidate.find({
    savedBy: viewerId,
    athlete: { $in: userIds },
  })
    .select('athlete')
    .lean();

  return new Set(records.map((record) => String(record.athlete)));
}

function serializeDiscoveryAthlete({ profile, user, verifiedAchievements, saved }) {
  const canBio = sectionIsVisible(profile, 'bio');
  const canSports = sectionIsVisible(profile, 'sports');
  const canCareer = sectionIsVisible(profile, 'career');
  const canLocation = sectionIsVisible(profile, 'location');
  const canStatistics = sectionIsVisible(profile, 'statistics');
  const canAchievements = sectionIsVisible(profile, 'achievements');
  const canContact = sectionIsVisible(profile, 'contact');

  return {
    userId: String(user._id),
    slug: profile.slug,
    name: user.name,
    avatarUrl: profile.avatar?.url || null,
    headline: canBio ? profile.headline || '' : '',
    bio: canBio ? profile.bio || '' : '',
    sports: canSports ? profile.sports || [] : [],
    positions: canSports ? profile.positions || [] : [],
    skills: canSports ? profile.skills || [] : [],
    level: canSports ? profile.level || null : null,
    ageCategory: canSports ? profile.ageCategory || null : null,
    competitionLevel: canSports ? profile.competitionLevel || null : null,
    experienceYears: canCareer ? profile.experienceYears ?? null : null,
    currentTeam: canSports ? profile.currentTeam || '' : '',
    location: canLocation
      ? {
          city: profile.location?.city || '',
          region: profile.location?.region || '',
          country: profile.location?.country || '',
        }
      : null,
    availableForTrials: canContact ? Boolean(profile.availableForTrials) : null,
    statisticsVisible: canStatistics,
    verifiedAchievements: canAchievements ? verifiedAchievements || 0 : 0,
    profileCompletion: profile.profileCompletion || 0,
    saved: Boolean(saved),
    updatedAt: profile.updatedAt,
  };
}

async function serializePage({ profiles, viewer }) {
  const userIds = profiles.map((profile) => profile.user?._id || profile.user);
  const canSeeAchievements = profiles.map((profile) =>
    sectionIsVisible(profile, 'achievements'),
  );
  const achievementVisibleIds = userIds.filter((_id, index) => canSeeAchievements[index]);
  const [achievementCounts, savedIds] = await Promise.all([
    getAchievementCounts(achievementVisibleIds),
    getSavedIds(viewer._id, userIds),
  ]);

  return profiles
    .filter((profile) => profile.user && profile.user.status === USER_STATUS.ACTIVE)
    .map((profile) =>
      serializeDiscoveryAthlete({
        profile,
        user: profile.user,
        verifiedAchievements: achievementCounts.get(String(profile.user._id)),
        saved: savedIds.has(String(profile.user._id)),
      }),
    );
}

async function searchAthletes(viewer, query) {
  const filter = await buildAthleteFilter(viewer, query);
  if (!filter) {
    return {
      athletes: [],
      meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
    };
  }

  const total = await AthleteProfile.countDocuments(filter);
  const skip = (query.page - 1) * query.limit;
  let profileQuery = AthleteProfile.find(filter).populate({
    path: 'user',
    select: 'name status role',
  });

  if (query.q && query.sort === 'relevance') {
    profileQuery = profileQuery
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: -1, profileCompletion: -1, updatedAt: -1 });
  } else {
    profileQuery = profileQuery.sort(
      getSortSpec(query) || { profileCompletion: -1, updatedAt: -1 },
    );
  }

  const profiles = await profileQuery.skip(skip).limit(query.limit);
  const athletes = await serializePage({ profiles, viewer });

  return {
    athletes,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

function assertSavedCandidateRole(viewer) {
  if (![ROLES.COACH, ROLES.RECRUITER].includes(viewer.role)) {
    throw ApiError.forbidden(
      'Only coaches and recruiters can save athlete candidates.',
      'SAVED_CANDIDATE_ROLE_FORBIDDEN',
    );
  }
}

async function hasBlockedRelation(firstUserId, secondUserId) {
  return Boolean(
    await BlockedUser.exists({
      $or: [
        { blocker: firstUserId, blocked: secondUserId },
        { blocker: secondUserId, blocked: firstUserId },
      ],
    }),
  );
}

async function listSavedAthletes(viewer, { page, limit }) {
  assertSavedCandidateRole(viewer);
  const blockedIds = await getBlockedUserIds(viewer._id);
  const userQuery = {
    role: ROLES.ATHLETE,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
    onboardingCompleted: true,
  };
  if (blockedIds.length > 0) {
    userQuery._id = { $nin: blockedIds };
  }

  const activeIds = await User.distinct('_id', userQuery);
  const visibleIds =
    activeIds.length > 0
      ? await AthleteProfile.find({
          user: { $in: activeIds },
          'visibility.sports': { $ne: 'private' },
        }).distinct('user')
      : [];

  const query = { savedBy: viewer._id, athlete: { $in: visibleIds } };
  const [total, savedRecords] = await Promise.all([
    SavedCandidate.countDocuments(query),
    SavedCandidate.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const userIds = savedRecords.map((record) => record.athlete);
  const profiles = await AthleteProfile.find({
    user: { $in: userIds },
    'visibility.sports': { $ne: 'private' },
  }).populate({ path: 'user', select: 'name status role' });

  const byUserId = new Map(
    profiles.map((profile) => [String(profile.user?._id || profile.user), profile]),
  );
  const ordered = userIds.map((userId) => byUserId.get(String(userId))).filter(Boolean);
  const athletes = await serializePage({ profiles: ordered, viewer });

  return {
    athletes,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function saveCandidate(viewer, athleteUserId) {
  assertSavedCandidateRole(viewer);

  if (!mongoose.Types.ObjectId.isValid(athleteUserId)) {
    throw ApiError.notFound('That athlete could not be found.', 'ATHLETE_NOT_FOUND');
  }

  const athlete = await User.findOne({
    _id: athleteUserId,
    role: ROLES.ATHLETE,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
    onboardingCompleted: true,
  }).select('name status role');

  if (!athlete) {
    throw ApiError.notFound('That athlete could not be found.', 'ATHLETE_NOT_FOUND');
  }

  const profile = await AthleteProfile.findOne({ user: athlete._id });
  if (!profile || !sectionIsVisible(profile, 'sports')) {
    throw ApiError.notFound('That athlete could not be found.', 'ATHLETE_NOT_FOUND');
  }

  if (await hasBlockedRelation(viewer._id, athlete._id)) {
    throw ApiError.notFound('That athlete could not be found.', 'ATHLETE_NOT_FOUND');
  }

  await SavedCandidate.findOneAndUpdate(
    { savedBy: viewer._id, athlete: athlete._id },
    { $setOnInsert: { savedBy: viewer._id, athlete: athlete._id } },
    { upsert: true, new: true },
  );

  return { athleteId: String(athlete._id), saved: true };
}

async function removeSavedCandidate(viewer, athleteUserId) {
  assertSavedCandidateRole(viewer);

  if (!mongoose.Types.ObjectId.isValid(athleteUserId)) {
    throw ApiError.notFound('That saved athlete could not be found.', 'SAVED_CANDIDATE_NOT_FOUND');
  }

  await SavedCandidate.deleteOne({ savedBy: viewer._id, athlete: athleteUserId });

  return { athleteId: athleteUserId, saved: false };
}

module.exports = {
  searchAthletes,
  listSavedAthletes,
  saveCandidate,
  removeSavedCandidate,
};
