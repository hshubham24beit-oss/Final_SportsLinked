const blockService = require('../services/block.service');
const { success } = require('../utils/apiResponse');

async function listBlocked(req, res) {
  const blocked = await blockService.listBlockedUsers(req.user);
  return success(res, { data: { blocked }, message: 'Blocked accounts retrieved.' });
}

async function blockUser(req, res) {
  const result = await blockService.blockUser(
    req.user,
    req.body.userId,
    req.body.reason,
  );
  return success(res, {
    statusCode: 201,
    data: { block: result },
    message: 'Account blocked.',
  });
}

async function unblockUser(req, res) {
  const result = await blockService.unblockUser(req.user, req.params.userId);
  return success(res, { data: { block: result }, message: 'Account unblocked.' });
}

module.exports = { listBlocked, blockUser, unblockUser };
