const messageService = require('../services/message.service');
const { success, paginated } = require('../utils/apiResponse');

async function listConversations(req, res) {
  const result = await messageService.listConversations(req.user, req.query);
  return paginated(res, {
    data: { conversations: result.conversations },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Conversations retrieved.',
  });
}

async function startConversation(req, res) {
  const result = await messageService.startConversation(req.user, req.body.userId);
  return success(res, {
    statusCode: result.created ? 201 : 200,
    data: { conversation: result.conversation },
    message: result.created ? 'Conversation started.' : 'Conversation retrieved.',
  });
}

async function getConversation(req, res) {
  const result = await messageService.getConversation(req.user, req.params.id);
  return success(res, {
    data: result,
    message: 'Conversation retrieved.',
  });
}

async function listMessages(req, res) {
  const result = await messageService.listMessages(req.user, req.params.id, req.query);
  return success(res, {
    data: { messages: result.messages },
    meta: result.meta,
    message: 'Messages retrieved.',
  });
}

async function sendMessage(req, res) {
  const result = await messageService.sendMessage(
    req.user,
    req.params.id,
    req.body.text,
  );
  return success(res, {
    statusCode: 201,
    data: result,
    message: 'Message sent.',
  });
}

async function markRead(req, res) {
  const result = await messageService.markConversationRead(req.user, req.params.id);
  return success(res, {
    data: result,
    message: 'Conversation marked as read.',
  });
}

async function reportConversation(req, res) {
  const result = await messageService.reportConversation(
    req.user,
    req.params.id,
    req.body,
  );
  return success(res, {
    statusCode: 201,
    data: result,
    message: 'Conversation reported. Thank you for helping keep SportLinked safe.',
  });
}

module.exports = {
  listConversations,
  startConversation,
  getConversation,
  listMessages,
  sendMessage,
  markRead,
  reportConversation,
};
