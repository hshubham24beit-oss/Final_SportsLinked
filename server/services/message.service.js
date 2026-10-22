const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const ApiError = require('../utils/ApiError');
const blockService = require('./block.service');
const notificationService = require('./notification.service');
const reportService = require('./report.service');
const { getTargetUser, getUserSummaryMap } = require('./social.service');
const { emitToUsers } = require('../sockets');
const {
  ROLES,
  MESSAGE_TEXT_MAX,
  MESSAGE_PAGE_DEFAULT,
  MESSAGE_PAGE_MAX,
  CONVERSATION_PAGE_DEFAULT,
  CONVERSATION_PAGE_MAX,
} = require('../config/constants');

function clamp(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function counterpartId(conversation, viewerId) {
  return String(
    conversation.participants.find(
      (participantId) => String(participantId) !== String(viewerId),
    ),
  );
}

function unreadFor(conversation, viewerId) {
  const entry = (conversation.unreadCounts || []).find(
    (item) => String(item.user) === String(viewerId),
  );
  return entry?.count || 0;
}

function serializeMessage(message) {
  const raw = message.toObject ? message.toObject() : { ...message };
  return {
    id: String(raw._id || raw.id),
    conversationId: String(raw.conversation),
    senderId: String(raw.sender),
    text: raw.text,
    readAt: raw.readAt || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function serializeConversation(conversation, summary, viewerId) {
  const raw = conversation.toObject ? conversation.toObject() : { ...conversation };
  return {
    id: String(raw._id || raw.id),
    participant: summary || null,
    lastMessage: raw.lastMessage
      ? {
          text: raw.lastMessage.text,
          senderId: String(raw.lastMessage.sender),
          sentAt: raw.lastMessage.sentAt,
        }
      : null,
    lastMessageAt: raw.lastMessageAt || null,
    unreadCount: unreadFor(raw, viewerId),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function canStartConversation(firstUser, targetUser) {
  if (firstUser.role === ROLES.ADMIN || targetUser.role === ROLES.ADMIN) {
    return false;
  }
  if (String(firstUser._id) === String(targetUser._id)) {
    return false;
  }

  const connected = await Connection.exists({
    pairKey: Connection.pairKey(firstUser._id, targetUser._id),
    status: 'accepted',
  });
  if (connected) {
    return true;
  }

  const athlete =
    firstUser.role === ROLES.ATHLETE
      ? firstUser
      : targetUser.role === ROLES.ATHLETE
        ? targetUser
        : null;
  const professional =
    [ROLES.COACH, ROLES.RECRUITER].includes(firstUser.role)
      ? firstUser
      : [ROLES.COACH, ROLES.RECRUITER].includes(targetUser.role)
        ? targetUser
        : null;

  if (!athlete || !professional) {
    return false;
  }

  const opportunityIds = await Opportunity.find({
    publisher: professional._id,
  }).distinct('_id');
  if (opportunityIds.length === 0) {
    return false;
  }

  return Boolean(
    await Application.exists({
      athlete: athlete._id,
      opportunity: { $in: opportunityIds },
    }),
  );
}

async function assertCanStartConversation(user, targetUserId) {
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Administrator accounts cannot use direct messages.',
      'MESSAGE_ADMIN_FORBIDDEN',
    );
  }
  if (String(user._id) === String(targetUserId)) {
    throw ApiError.badRequest(
      'You cannot start a conversation with yourself.',
      'MESSAGE_SELF',
    );
  }

  const target = await getTargetUser(targetUserId);
  await blockService.assertNotBlocked(user._id, target._id);

  if (!(await canStartConversation(user, target))) {
    throw ApiError.forbidden(
      'You can message accepted connections or an applicant connected to one of your opportunities.',
      'MESSAGE_NOT_ALLOWED',
    );
  }

  return target;
}

async function findConversationForUser(user, conversationId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw ApiError.notFound('Conversation not found.', 'CONVERSATION_NOT_FOUND');
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: user._id,
  });
  if (!conversation) {
    throw ApiError.notFound('Conversation not found.', 'CONVERSATION_NOT_FOUND');
  }

  const otherId = counterpartId(conversation, user._id);
  await blockService.assertNotBlocked(user._id, otherId);
  return conversation;
}

async function listConversations(user, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = clamp(query.limit, CONVERSATION_PAGE_DEFAULT, CONVERSATION_PAGE_MAX);
  const blockedIds = await blockService.getBlockedUserIds(user._id);
  const filter = {
    participants: { $all: [user._id] },
    ...(blockedIds.length > 0 ? { participants: { $all: [user._id], $nin: blockedIds } } : {}),
  };

  const [records, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  const summaries = await getUserSummaryMap(
    records.map((record) => counterpartId(record, user._id)),
  );

  return {
    conversations: records.map((record) =>
      serializeConversation(
        record,
        summaries.get(counterpartId(record, user._id)),
        user._id,
      ),
    ),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function startConversation(user, targetUserId) {
  const target = await assertCanStartConversation(user, targetUserId);
  const pairKey = Conversation.pairKey(user._id, target._id);

  let conversation = await Conversation.findOne({ pairKey });
  if (!conversation) {
    try {
      conversation = await Conversation.create({
        participants: [user._id, target._id],
        pairKey,
        unreadCounts: [
          { user: user._id, count: 0 },
          { user: target._id, count: 0 },
        ],
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
      conversation = await Conversation.findOne({ pairKey });
    }
  }

  const summaries = await getUserSummaryMap([target._id]);
  return {
    conversation: serializeConversation(
      conversation,
      summaries.get(String(target._id)),
      user._id,
    ),
    created: conversation.createdAt.getTime() === conversation.updatedAt.getTime(),
  };
}

async function getConversation(user, conversationId) {
  const conversation = await findConversationForUser(user, conversationId);
  const otherId = counterpartId(conversation, user._id);
  const summaries = await getUserSummaryMap([otherId]);
  return {
    conversation: serializeConversation(
      conversation,
      summaries.get(otherId),
      user._id,
    ),
  };
}

async function listMessages(user, conversationId, query = {}) {
  const conversation = await findConversationForUser(user, conversationId);
  const limit = clamp(query.limit, MESSAGE_PAGE_DEFAULT, MESSAGE_PAGE_MAX);
  const filter = { conversation: conversation._id };

  if (query.before) {
    if (!mongoose.Types.ObjectId.isValid(query.before)) {
      throw ApiError.badRequest('Invalid message cursor.', 'MESSAGE_CURSOR_INVALID');
    }
    filter._id = { $lt: query.before };
  }

  const records = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = records.length > limit;
  const pageRecords = hasMore ? records.slice(0, limit) : records;
  const messages = pageRecords.reverse().map(serializeMessage);
  const nextCursor = hasMore && messages.length > 0 ? messages[0].id : null;

  return {
    messages,
    meta: {
      limit,
      hasMore,
      nextCursor,
    },
  };
}

async function sendMessage(user, conversationId, text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw ApiError.badRequest('Write a message before sending.', 'MESSAGE_EMPTY');
  }
  if (trimmed.length > MESSAGE_TEXT_MAX) {
    throw ApiError.badRequest(
      `Messages cannot exceed ${MESSAGE_TEXT_MAX} characters.`,
      'MESSAGE_TOO_LONG',
    );
  }

  const conversation = await findConversationForUser(user, conversationId);
  const message = await Message.create({
    conversation: conversation._id,
    sender: user._id,
    text: trimmed,
  });
  const sentAt = message.createdAt || new Date();

  const unreadCounts = conversation.participants.map((participantId) => {
    const current = (conversation.unreadCounts || []).find(
      (item) => String(item.user) === String(participantId),
    );
    return {
      user: participantId,
      count:
        String(participantId) === String(user._id) ? 0 : (current?.count || 0) + 1,
    };
  });

  conversation.lastMessage = {
    text: trimmed,
    sender: user._id,
    sentAt,
  };
  conversation.lastMessageAt = sentAt;
  conversation.unreadCounts = unreadCounts;
  await conversation.save();

  const otherId = counterpartId(conversation, user._id);
  const payload = serializeMessage(message);
  emitToUsers(conversation.participants, 'message:new', {
    conversationId: String(conversation._id),
    message: payload,
  });

  await notificationService.createNotification({
    userId: otherId,
    type: 'message_received',
    title: 'New message',
    message: `${user.name} sent you a message.`,
    link: `/messages?conversation=${conversation._id.toString()}`,
    metadata: {
      conversationId: conversation._id.toString(),
      senderId: user._id.toString(),
    },
  });

  return { message: payload };
}

async function markConversationRead(user, conversationId) {
  const conversation = await findConversationForUser(user, conversationId);
  const readAt = new Date();

  const result = await Message.updateMany(
    {
      conversation: conversation._id,
      sender: { $ne: user._id },
      readAt: null,
    },
    { $set: { readAt } },
  );

  const unreadCounts = conversation.participants.map((participantId) => ({
    user: participantId,
    count:
      String(participantId) === String(user._id)
        ? 0
        : (conversation.unreadCounts || []).find(
            (item) => String(item.user) === String(participantId),
          )?.count || 0,
  }));
  conversation.unreadCounts = unreadCounts;
  await conversation.save();

  const otherId = counterpartId(conversation, user._id);
  emitToUsers([otherId, user._id], 'message:read', {
    conversationId: String(conversation._id),
    readerId: String(user._id),
    readAt,
  });

  return {
    conversationId: String(conversation._id),
    readAt,
    updated: result.modifiedCount,
  };
}

async function reportConversation(user, conversationId, input) {
  const conversation = await findConversationForUser(user, conversationId);
  const report = await reportService.createReport(user, {
    targetType: 'message',
    targetId: String(conversation._id),
    reason: input.reason,
    details: input.details || '',
  });
  return { report };
}

module.exports = {
  canStartConversation,
  listConversations,
  startConversation,
  getConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  reportConversation,
};
