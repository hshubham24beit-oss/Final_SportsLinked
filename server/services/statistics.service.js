const AthleteProfile = require('../models/AthleteProfile');
const ApiError = require('../utils/ApiError');
const { ROLES, STATISTIC_MAX } = require('../config/constants');

function serializeStatistic(item) {
  if (!item) {
    return null;
  }
  const raw = item.toJSON ? item.toJSON() : { ...item };
  if (raw._id) {
    raw.id = raw._id.toString();
    delete raw._id;
  }
  delete raw.__v;
  return raw;
}

function assertAthlete(user) {
  if (user.role !== ROLES.ATHLETE) {
    throw ApiError.forbidden(
      'Statistics are available on athlete profiles only.',
      'STATISTICS_ROLE_FORBIDDEN',
    );
  }
}

async function getAthleteProfile(user) {
  assertAthlete(user);
  const profile = await AthleteProfile.findOne({ user: user._id });
  if (!profile) {
    throw ApiError.notFound(
      'Complete onboarding before managing statistics.',
      'PROFILE_NOT_FOUND',
    );
  }
  return profile;
}

async function listStatistics(user) {
  const profile = await getAthleteProfile(user);
  return profile.statistics.map(serializeStatistic);
}

async function addStatistic(user, data) {
  const profile = await getAthleteProfile(user);
  if (profile.statistics.length >= STATISTIC_MAX) {
    throw ApiError.badRequest(
      `You can add up to ${STATISTIC_MAX} statistics.`,
      'STATISTIC_LIMIT_REACHED',
    );
  }

  profile.statistics.push(data);
  await profile.save();
  return serializeStatistic(profile.statistics[profile.statistics.length - 1]);
}

async function updateStatistic(user, statisticId, data) {
  const profile = await getAthleteProfile(user);
  const statistic = profile.statistics.id(statisticId);
  if (!statistic) {
    throw ApiError.notFound('That statistic could not be found.', 'STATISTIC_NOT_FOUND');
  }

  for (const [key, value] of Object.entries(data)) {
    statistic.set(key, value);
  }

  await profile.save();
  return serializeStatistic(statistic);
}

async function deleteStatistic(user, statisticId) {
  const profile = await getAthleteProfile(user);
  const statistic = profile.statistics.id(statisticId);
  if (!statistic) {
    throw ApiError.notFound('That statistic could not be found.', 'STATISTIC_NOT_FOUND');
  }

  statistic.deleteOne();
  await profile.save();
}

module.exports = {
  listStatistics,
  addStatistic,
  updateStatistic,
  deleteStatistic,
};
