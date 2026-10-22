const express = require('express');
const blockController = require('../controllers/block.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { blockCreateSchema } = require('../validators/verification.validator');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);
router.get('/', asyncHandler(blockController.listBlocked));
router.post('/', validate(blockCreateSchema), asyncHandler(blockController.blockUser));
router.delete('/:userId', asyncHandler(blockController.unblockUser));

module.exports = router;
