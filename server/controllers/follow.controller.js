const followService = require('../services/follow.service');
const { success } = require('../utils/apiResponse');

async function follow(req, res) {
  const result = await followService.followUser(req.user, req.params.userId);
  return success(res, {
    message: 'Now following.',
    data: result,
  });
}

async function unfollow(req, res) {
  const result = await followService.unfollowUser(req.user, req.params.userId);
  return success(res, {
    message: 'No longer following.',
    data: result,
  });
}

async function followers(req, res) {
  const result = await followService.listFollowers(req.params.userId, req.query);
  return success(res, {
    message: 'Followers retrieved.',
    data: result,
  });
}

async function following(req, res) {
  const result = await followService.listFollowing(req.params.userId, req.query);
  return success(res, {
    message: 'Following retrieved.',
    data: result,
  });
}

module.exports = { follow, unfollow, followers, following };
