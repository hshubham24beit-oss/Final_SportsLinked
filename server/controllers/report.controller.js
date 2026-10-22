const reportService = require('../services/report.service');
const { success, paginated } = require('../utils/apiResponse');

async function createReport(req, res) {
  const report = await reportService.createReport(req.user, req.body);
  return success(res, {
    statusCode: 201,
    message: 'Report submitted. Thank you for helping keep SportLinked safe.',
    data: { report },
  });
}

async function listMyReports(req, res) {
  const result = await reportService.listOwnReports(req.user);
  return success(res, { data: { reports: result.reports }, message: 'Reports retrieved.' });
}

async function adminListReports(req, res) {
  const result = await reportService.adminListReports(req.query);
  return paginated(res, {
    data: {
      reports: result.reports,
      statusCounts: result.statusCounts,
    },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Reports retrieved.',
  });
}

async function adminUpdateReport(req, res) {
  const report = await reportService.adminUpdateReport(req.user, req.params.id, req.body);
  return success(res, { data: { report }, message: 'Report updated.' });
}

module.exports = {
  createReport,
  listMyReports,
  adminListReports,
  adminUpdateReport,
};
