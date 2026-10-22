const express = require('express');
const messageController = require('../controllers/message.controller');
const {
  authenticate,
  requireUnrestrictedAccount,
} = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  startConversationSchema,
  sendMessageSchema,
  conversationListQuerySchema,
  messageListQuerySchema,
  reportConversationSchema,
} = require('../validators/message.validator');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  validate(conversationListQuerySchema, 'query'),
  asyncHandler(messageController.listConversations),
);
router.post(
  '/',
  requireUnrestrictedAccount,
  validate(startConversationSchema),
  asyncHandler(messageController.startConversation),
);

router.get('/:id', asyncHandler(messageController.getConversation));
router.get(
  '/:id/messages',
  validate(messageListQuerySchema, 'query'),
  asyncHandler(messageController.listMessages),
);
router.post(
  '/:id/messages',
  requireUnrestrictedAccount,
  validate(sendMessageSchema),
  asyncHandler(messageController.sendMessage),
);
router.post('/:id/read', asyncHandler(messageController.markRead));
router.post(
  '/:id/report',
  validate(reportConversationSchema),
  asyncHandler(messageController.reportConversation),
);

module.exports = router;
