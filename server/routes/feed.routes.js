const express = require('express');
const postController = require('../controllers/post.controller');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);
router.get('/', asyncHandler(postController.feed));

module.exports = router;
