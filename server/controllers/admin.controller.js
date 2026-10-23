const adminService = require('../services/admin.service');
const { success, paginated } = require('../utils/apiResponse');

async function overview(req, res) {
  const data = await adminService.adminOverview();
  return success(res, { data, message: 'Admin overview retrieved.' });
}

async function listUsers(req, res) {
  const result = await adminService.adminListUsers(req.query);
  return paginated(res, {
    data: { users: result.users },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Users retrieved.',
  });
}

async function getUser(req, res) {
  const data = await adminService.adminGetUser(req.params.id);
  return success(res, { data, message: 'User retrieved.' });
}

async function listOrganizations(req, res) {
  const result = await adminService.adminListOrganizations(req.query);
  return paginated(res, {
    data: { organizations: result.organizations },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Organisations retrieved.',
  });
}

async function getOrganization(req, res) {
  const data = await adminService.adminGetOrganization(req.params.id);
  return success(res, { data, message: 'Organisation retrieved.' });
}

async function updateUserStatus(req, res) {
  const user = await adminService.adminUpdateUserStatus(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, { data: { user }, message: 'Account status updated.' });
}

async function activity(req, res) {
  const result = await adminService.adminActivity(req.query);
  return paginated(res, {
    data: { activity: result.activity },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Moderation activity retrieved.',
  });
}

module.exports = {
  overview,
  listUsers,
  getUser,
  updateUserStatus,
  activity,
  listOrganizations,
  getOrganization,
};
