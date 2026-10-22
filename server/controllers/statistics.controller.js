const statisticsService = require('../services/statistics.service');
const { success } = require('../utils/apiResponse');

async function listStatistics(req, res) {
  const statistics = await statisticsService.listStatistics(req.user);

  return success(res, {
    message: 'Statistics retrieved.',
    data: { statistics },
  });
}

async function addStatistic(req, res) {
  const statistic = await statisticsService.addStatistic(req.user, req.body);

  return success(res, {
    statusCode: 201,
    message: 'Statistic added.',
    data: { statistic },
  });
}

async function updateStatistic(req, res) {
  const statistic = await statisticsService.updateStatistic(
    req.user,
    req.params.statisticId,
    req.body,
  );

  return success(res, {
    message: 'Statistic updated.',
    data: { statistic },
  });
}

async function deleteStatistic(req, res) {
  await statisticsService.deleteStatistic(req.user, req.params.statisticId);

  return success(res, {
    message: 'Statistic deleted.',
    data: null,
  });
}

module.exports = {
  listStatistics,
  addStatistic,
  updateStatistic,
  deleteStatistic,
};
