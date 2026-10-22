const postService = require('../services/post.service');
const { success } = require('../utils/apiResponse');

async function feed(req, res) {
  const result = await postService.listFeed(req.user, req.query);
  return success(res, {
    message: 'Feed retrieved.',
    data: { posts: result.posts },
    meta: result.meta,
  });
}

async function uploadMedia(req, res) {
  const media = await postService.uploadPostMedia(req.user, req.file);
  return success(res, {
    statusCode: 201,
    message: 'Post image uploaded.',
    data: { media },
  });
}

async function createPost(req, res) {
  const post = await postService.createPost(req.user, req.body);
  return success(res, {
    statusCode: 201,
    message: 'Post published.',
    data: { post },
  });
}

async function getPost(req, res) {
  const post = await postService.getPost(req.user, req.params.postId);
  return success(res, { message: 'Post retrieved.', data: { post } });
}

async function updatePost(req, res) {
  const post = await postService.updatePost(req.user, req.params.postId, req.body);
  return success(res, { message: 'Post updated.', data: { post } });
}

async function deletePost(req, res) {
  const result = await postService.deletePost(req.user, req.params.postId);
  return success(res, { message: 'Post deleted.', data: result });
}

async function likePost(req, res) {
  const result = await postService.likePost(req.user, req.params.postId);
  return success(res, { message: 'Post liked.', data: result });
}

async function unlikePost(req, res) {
  const result = await postService.unlikePost(req.user, req.params.postId);
  return success(res, { message: 'Like removed.', data: result });
}

async function listComments(req, res) {
  const result = await postService.listComments(req.user, req.params.postId, req.query);
  return success(res, {
    message: 'Comments retrieved.',
    data: { comments: result.comments },
    meta: result.meta,
  });
}

async function addComment(req, res) {
  const comment = await postService.addComment(
    req.user,
    req.params.postId,
    req.body.text,
  );
  return success(res, {
    statusCode: 201,
    message: 'Comment added.',
    data: { comment },
  });
}

async function deleteComment(req, res) {
  const result = await postService.deleteComment(
    req.user,
    req.params.postId,
    req.params.commentId,
  );
  return success(res, { message: 'Comment deleted.', data: result });
}

async function sharePost(req, res) {
  const result = await postService.sharePost(
    req.user,
    req.params.postId,
    req.body.text || '',
  );
  return success(res, {
    statusCode: 201,
    message: result.alreadyShared ? 'Post already shared.' : 'Post shared.',
    data: result,
  });
}

module.exports = {
  feed,
  uploadMedia,
  createPost,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  listComments,
  addComment,
  deleteComment,
  sharePost,
};
