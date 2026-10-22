const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/apiResponse');

async function getDashboard(req, res) {
  const dashboard = await dashboardService.getDashboard(req.user);
  return success(res, { data: { dashboard }, message: 'Dashboard retrieved.' });
}

module.exports = { getDashboard };
