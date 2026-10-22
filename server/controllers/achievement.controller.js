const achievementService = require('../services/achievement.service');
const { success } = require('../utils/apiResponse');

async function listAchievements(req, res) {
  const achievements = await achievementService.listAchievements(req.user);

  return success(res, {
    message: 'Achievements retrieved.',
    data: { achievements },
  });
}

async function createAchievement(req, res) {
  const achievement = await achievementService.createAchievement(req.user, req.body);

  return success(res, {
    statusCode: 201,
    message: 'Achievement added.',
    data: { achievement },
  });
}

async function updateAchievement(req, res) {
  const achievement = await achievementService.updateAchievement(
    req.user,
    req.params.achievementId,
    req.body,
  );

  return success(res, {
    message: 'Achievement updated.',
    data: { achievement },
  });
}

async function deleteAchievement(req, res) {
  await achievementService.deleteAchievement(req.user, req.params.achievementId);

  return success(res, {
    message: 'Achievement deleted.',
    data: null,
  });
}

module.exports = {
  listAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
};
