const discoveryService = require('../services/discovery.service');
const { success, paginated } = require('../utils/apiResponse');

async function searchAthletes(req, res) {
  const result = await discoveryService.searchAthletes(req.user, req.query);

  return paginated(res, {
    data: { athletes: result.athletes },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Athletes retrieved.',
  });
}

async function listSavedAthletes(req, res) {
  const result = await discoveryService.listSavedAthletes(req.user, req.query);

  return paginated(res, {
    data: { athletes: result.athletes },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Saved athletes retrieved.',
  });
}

async function saveCandidate(req, res) {
  const result = await discoveryService.saveCandidate(req.user, req.params.athleteId);

  return success(res, {
    statusCode: 201,
    message: 'Athlete saved.',
    data: result,
  });
}

async function removeSavedCandidate(req, res) {
  const result = await discoveryService.removeSavedCandidate(
    req.user,
    req.params.athleteId,
  );

  return success(res, {
    message: 'Athlete removed from saved candidates.',
    data: result,
  });
}

module.exports = {
  searchAthletes,
  listSavedAthletes,
  saveCandidate,
  removeSavedCandidate,
};
