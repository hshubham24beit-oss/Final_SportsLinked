const opportunityService = require('../services/opportunity.service');
const { success, paginated } = require('../utils/apiResponse');

async function listOpportunities(req, res) {
  const result = await opportunityService.listOpportunities(req.user, req.query);
  return paginated(res, {
    data: { opportunities: result.opportunities },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Opportunities retrieved.',
  });
}

async function listMyOpportunities(req, res) {
  const result = await opportunityService.listMyOpportunities(req.user, req.query);
  return paginated(res, {
    data: { opportunities: result.opportunities },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Your opportunities retrieved.',
  });
}

async function listSavedOpportunities(req, res) {
  const result = await opportunityService.listSavedOpportunities(req.user, req.query);
  return paginated(res, {
    data: { opportunities: result.opportunities },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Saved opportunities retrieved.',
  });
}

async function getOpportunity(req, res) {
  const opportunity = await opportunityService.getOpportunity(req.user, req.params.id);
  return success(res, { data: { opportunity }, message: 'Opportunity retrieved.' });
}

async function createOpportunity(req, res) {
  const opportunity = await opportunityService.createOpportunity(req.user, req.body);
  return success(res, {
    statusCode: 201,
    data: { opportunity },
    message: 'Draft opportunity created.',
  });
}

async function updateOpportunity(req, res) {
  const opportunity = await opportunityService.updateOpportunity(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, { data: { opportunity }, message: 'Opportunity updated.' });
}

async function publishOpportunity(req, res) {
  const opportunity = await opportunityService.publishOpportunity(req.user, req.params.id);
  return success(res, { data: { opportunity }, message: 'Opportunity published.' });
}

async function closeOpportunity(req, res) {
  const opportunity = await opportunityService.closeOpportunity(req.user, req.params.id);
  return success(res, { data: { opportunity }, message: 'Opportunity closed.' });
}

async function saveOpportunity(req, res) {
  const result = await opportunityService.saveOpportunity(req.user, req.params.id);
  return success(res, { statusCode: 201, data: result, message: 'Opportunity saved.' });
}

async function unsaveOpportunity(req, res) {
  const result = await opportunityService.unsaveOpportunity(req.user, req.params.id);
  return success(res, { data: result, message: 'Opportunity removed from saved.' });
}

module.exports = {
  listOpportunities,
  listMyOpportunities,
  listSavedOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  publishOpportunity,
  closeOpportunity,
  saveOpportunity,
  unsaveOpportunity,
};
