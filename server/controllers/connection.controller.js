const connectionService = require('../services/connection.service');
const { success } = require('../utils/apiResponse');

async function sendRequest(req, res) {
  const connection = await connectionService.sendConnectionRequest(
    req.user,
    req.body.userId,
    req.body.message || '',
  );
  return success(res, {
    statusCode: 201,
    message: 'Connection request sent.',
    data: { connection },
  });
}

async function listConnections(req, res) {
  const result = await connectionService.listConnections(req.user, req.query);
  return success(res, {
    message: 'Connections retrieved.',
    data: { connections: result.connections },
    meta: result.meta,
  });
}

async function listRequests(req, res) {
  const result = await connectionService.listRequests(req.user, req.query);
  return success(res, {
    message: 'Connection requests retrieved.',
    data: { requests: result.requests, direction: result.direction, status: result.status },
  });
}

async function suggestions(req, res) {
  const result = await connectionService.listSuggestions(req.user, req.query);
  return success(res, {
    message: 'Connection suggestions retrieved.',
    data: result,
  });
}

async function mutual(req, res) {
  const result = await connectionService.listMutualConnections(
    req.user,
    req.params.userId,
  );
  return success(res, {
    message: 'Mutual connections retrieved.',
    data: result,
  });
}

async function acceptRequest(req, res) {
  const connection = await connectionService.respondToConnection(
    req.user,
    req.params.connectionId,
    'accepted',
  );
  return success(res, {
    message: 'Connection request accepted.',
    data: { connection },
  });
}

async function rejectRequest(req, res) {
  const connection = await connectionService.respondToConnection(
    req.user,
    req.params.connectionId,
    'rejected',
  );
  return success(res, {
    message: 'Connection request declined.',
    data: { connection },
  });
}

async function cancelRequest(req, res) {
  const connection = await connectionService.cancelConnectionRequest(
    req.user,
    req.params.connectionId,
  );
  return success(res, {
    message: 'Connection request cancelled.',
    data: { connection },
  });
}

async function removeConnection(req, res) {
  const result = await connectionService.removeConnection(
    req.user,
    req.params.connectionId,
  );
  return success(res, {
    message: 'Connection removed.',
    data: result,
  });
}

module.exports = {
  sendRequest,
  listConnections,
  listRequests,
  suggestions,
  mutual,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  removeConnection,
};
