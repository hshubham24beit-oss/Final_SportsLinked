const Achievement = require('../models/Achievement');
const ApiError = require('../utils/ApiError');
const { serializeAchievementForViewer } = require('./profile.service');
const { deleteVerificationDataForAchievement } = require('./verification.service');
const { ROLES } = require('../config/constants');

const ACHIEVEMENT_ROLES = [ROLES.ATHLETE, ROLES.COACH, ROLES.RECRUITER];

function assertCanManageAchievements(user) {
  if (!ACHIEVEMENT_ROLES.includes(user.role)) {
    throw ApiError.forbidden(
      'Achievements are available for athlete, coach, and organization accounts.',
      'ACHIEVEMENT_ROLE_FORBIDDEN',
    );
  }
}

async function listAchievements(user) {
  assertCanManageAchievements(user);
  const achievements = await Achievement.find({ user: user._id }).sort({
    date: -1,
    createdAt: -1,
  });

  return achievements.map((achievement) =>
    serializeAchievementForViewer(achievement, { includeEvidence: true }),
  );
}

async function createAchievement(user, data) {
  assertCanManageAchievements(user);
  const achievement = await Achievement.create({
    ...data,
    user: user._id,
    verificationStatus: 'unverified',
  });

  return serializeAchievementForViewer(achievement, { includeEvidence: true });
}

async function findOwnedAchievement(user, achievementId) {
  const achievement = await Achievement.findById(achievementId);
  if (!achievement) {
    throw ApiError.notFound('That achievement could not be found.', 'ACHIEVEMENT_NOT_FOUND');
  }
  if (String(achievement.user) !== String(user._id)) {
    throw ApiError.forbidden(
      'You do not have permission to change this achievement.',
      'ACHIEVEMENT_FORBIDDEN',
    );
  }
  return achievement;
}

async function updateAchievement(user, achievementId, data) {
  assertCanManageAchievements(user);
  const achievement = await findOwnedAchievement(user, achievementId);

  for (const [key, value] of Object.entries(data)) {
    if (key === 'verificationStatus' || key === 'verifiedBy' || key === 'verifiedAt') {
      continue;
    }
    achievement.set(key, value);
  }

  await achievement.save();
  return serializeAchievementForViewer(achievement, { includeEvidence: true });
}

async function deleteAchievement(user, achievementId) {
  assertCanManageAchievements(user);
  const achievement = await findOwnedAchievement(user, achievementId);
  await deleteVerificationDataForAchievement(achievement._id);
  await achievement.deleteOne();
}

module.exports = {
  listAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
};
