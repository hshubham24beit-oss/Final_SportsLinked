const { z } = require('zod');
const {
  MESSAGE_TEXT_MAX,
  REPORT_REASONS,
  CONVERSATION_PAGE_MAX,
  MESSAGE_PAGE_MAX,
} = require('../config/constants');

const startConversationSchema = z.object({
  userId: z.string().trim().min(1, 'Choose an account to message.'),
});

const sendMessageSchema = z.object({
  text: z
    .string({ required_error: 'Write a message before sending.' })
    .trim()
    .min(1, 'Write a message before sending.')
    .max(MESSAGE_TEXT_MAX, `Messages cannot exceed ${MESSAGE_TEXT_MAX} characters.`),
});

const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(CONVERSATION_PAGE_MAX).default(20),
});

const messageListQuerySchema = z.object({
  before: z.string().trim().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(MESSAGE_PAGE_MAX).default(30),
});

const reportConversationSchema = z.object({
  reason: z.enum(REPORT_REASONS, {
    required_error: 'Choose a reason for the report.',
  }),
  details: z.string().trim().max(2000).optional(),
});

module.exports = {
  startConversationSchema,
  sendMessageSchema,
  conversationListQuerySchema,
  messageListQuerySchema,
  reportConversationSchema,
};
