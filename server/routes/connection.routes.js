const express = require('express');
const connectionController = require('../controllers/connection.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { sendConnectionSchema } = require('../validators/connection.validator');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(connectionController.listConnections));
router.get('/requests', asyncHandler(connectionController.listRequests));
router.get('/suggestions', asyncHandler(connectionController.suggestions));
router.get('/mutual/:userId', asyncHandler(connectionController.mutual));

router.post(
  '/requests',
  validate(sendConnectionSchema),
  asyncHandler(connectionController.sendRequest),
);
router.post(
  '/:connectionId/accept',
  asyncHandler(connectionController.acceptRequest),
);
router.post(
  '/:connectionId/reject',
  asyncHandler(connectionController.rejectRequest),
);
router.post(
  '/:connectionId/cancel',
  asyncHandler(connectionController.cancelRequest),
);
router.delete('/:connectionId', asyncHandler(connectionController.removeConnection));

module.exports = router;
