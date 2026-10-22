const teamService = require('../services/team.service');
const { success, paginated } = require('../utils/apiResponse');

async function discoverTeams(req, res) {
  const result = await teamService.listDiscover(req.user, req.query);
  return paginated(res, {
    data: { teams: result.teams },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Local teams and groups retrieved.',
  });
}

async function listMyTeams(req, res) {
  const result = await teamService.listMyTeams(req.user);
  return success(res, {
    data: { teams: result.teams },
    message: 'Your teams retrieved.',
  });
}

async function getTeam(req, res) {
  const team = await teamService.getTeam(req.user, req.params.id);
  return success(res, { data: { team }, message: 'Team retrieved.' });
}

async function createTeam(req, res) {
  const team = await teamService.createTeam(req.user, req.body);
  return success(res, {
    statusCode: 201,
    data: { team },
    message: 'Team created.',
  });
}

async function updateTeam(req, res) {
  const team = await teamService.updateTeam(req.user, req.params.id, req.body);
  return success(res, { data: { team }, message: 'Team updated.' });
}

async function deleteTeam(req, res) {
  const result = await teamService.deleteTeam(req.user, req.params.id);
  return success(res, { data: result, message: 'Team deleted.' });
}

async function inviteMember(req, res) {
  const result = await teamService.inviteMember(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, {
    statusCode: 201,
    data: result,
    message: 'Team invitation sent.',
  });
}

async function respondToInvitation(req, res) {
  const result = await teamService.respondToInvitation(
    req.user,
    req.params.id,
    req.body.accept,
  );
  return success(res, {
    data: result,
    message: req.body.accept ? 'Team invitation accepted.' : 'Team invitation declined.',
  });
}

async function listMembers(req, res) {
  const result = await teamService.listMembers(req.user, req.params.id);
  return success(res, {
    data: result,
    message: 'Team members retrieved.',
  });
}

async function removeMember(req, res) {
  const result = await teamService.removeMember(
    req.user,
    req.params.id,
    req.params.userId,
  );
  return success(res, { data: result, message: 'Team member removed.' });
}

async function updateMemberRole(req, res) {
  const result = await teamService.updateMemberRole(
    req.user,
    req.params.id,
    req.params.userId,
    req.body.role,
  );
  return success(res, { data: result, message: 'Team member role updated.' });
}

async function leaveTeam(req, res) {
  const result = await teamService.leaveTeam(req.user, req.params.id);
  return success(res, { data: result, message: 'You left the team.' });
}

async function listUpdates(req, res) {
  const result = await teamService.listUpdates(req.user, req.params.id);
  return success(res, {
    data: { updates: result.updates, team: result.team },
    message: 'Team updates retrieved.',
  });
}

async function postUpdate(req, res) {
  const result = await teamService.postUpdate(
    req.user,
    req.params.id,
    req.body.text,
  );
  return success(res, {
    statusCode: 201,
    data: result,
    message: 'Team update posted.',
  });
}

module.exports = {
  discoverTeams,
  listMyTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  respondToInvitation,
  listMembers,
  removeMember,
  updateMemberRole,
  leaveTeam,
  listUpdates,
  postUpdate,
};
