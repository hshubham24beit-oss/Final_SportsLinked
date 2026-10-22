const mongoose = require('mongoose');
const { Server } = require('socket.io');
const config = require('../config/env');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const blockService = require('../services/block.service');
const { verifyAccessToken } = require('../utils/tokens');
const { USER_STATUS } = require('../config/constants');

let io = null;

function userRoom(userId) {
  return `user:${String(userId)}`;
}

function emitToUser(userId, event, payload) {
  if (io && userId) {
    io.to(userRoom(userId)).emit(event, payload);
  }
}

function emitToUsers(userIds, event, payload) {
  if (!io) {
    return;
  }
  [...new Set(userIds.map(String))].forEach((userId) => {
    io.to(userRoom(userId)).emit(event, payload);
  });
}

function initializeSocket(httpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const header = socket.handshake.headers.authorization || '';
      const token =
        socket.handshake.auth?.token ||
        (header.startsWith('Bearer ') ? header.slice(7).trim() : '');

      if (!token) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('name role status');
      if (
        !user ||
        ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(user.status)
      ) {
        return next(new Error('AUTH_INVALID'));
      }

      socket.data.user = {
        id: String(user._id),
        name: user.name,
        role: user.role,
      };
      return next();
    } catch {
      return next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(userRoom(user.id));

    socket.on('message:typing', async (payload = {}, acknowledge = () => {}) => {
      try {
        const conversationId = String(payload.conversationId || '');
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          throw new Error('CONVERSATION_NOT_FOUND');
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: user.id,
        })
          .select('participants')
          .lean();
        if (!conversation) {
          throw new Error('CONVERSATION_NOT_FOUND');
        }

        const otherId = conversation.participants
          .map(String)
          .find((participantId) => participantId !== user.id);
        await blockService.assertNotBlocked(user.id, otherId);

        emitToUser(otherId, 'message:typing', {
          conversationId,
          userId: user.id,
          isTyping: Boolean(payload.isTyping),
        });
        if (typeof acknowledge === 'function') {
          acknowledge({ ok: true });
        }
      } catch (error) {
        if (typeof acknowledge === 'function') {
          acknowledge({
            ok: false,
            code: error.code || error.message || 'TYPING_FAILED',
          });
        }
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

async function closeSocket() {
  if (!io) {
    return;
  }
  await new Promise((resolve) => {
    io.close(() => resolve());
  });
  io = null;
}

module.exports = {
  initializeSocket,
  getIO,
  closeSocket,
  emitToUser,
  emitToUsers,
  userRoom,
};
