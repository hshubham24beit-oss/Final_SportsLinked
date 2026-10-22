const express = require('express');
const postController = require('../controllers/post.controller');
const { authenticate, requireUnrestrictedAccount } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  postCreateSchema,
  postUpdateSchema,
  commentCreateSchema,
  shareCreateSchema,
} = require('../validators/post.validator');
const { singleImageUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.post(
  '/media',
  requireUnrestrictedAccount,
  uploadLimiter,
  singleImageUpload,
  asyncHandler(postController.uploadMedia),
);

router.post(
  '/',
  requireUnrestrictedAccount,
  validate(postCreateSchema),
  asyncHandler(postController.createPost),
);
router.get('/:postId', asyncHandler(postController.getPost));
router.patch(
  '/:postId',
  requireUnrestrictedAccount,
  validate(postUpdateSchema),
  asyncHandler(postController.updatePost),
);
router.delete('/:postId', asyncHandler(postController.deletePost));

router.post(
  '/:postId/like',
  requireUnrestrictedAccount,
  asyncHandler(postController.likePost),
);
router.delete(
  '/:postId/like',
  requireUnrestrictedAccount,
  asyncHandler(postController.unlikePost),
);

router.get('/:postId/comments', asyncHandler(postController.listComments));
router.post(
  '/:postId/comments',
  requireUnrestrictedAccount,
  validate(commentCreateSchema),
  asyncHandler(postController.addComment),
);
router.delete(
  '/:postId/comments/:commentId',
  requireUnrestrictedAccount,
  asyncHandler(postController.deleteComment),
);

router.post(
  '/:postId/share',
  requireUnrestrictedAccount,
  validate(shareCreateSchema),
  asyncHandler(postController.sharePost),
);

module.exports = router;
