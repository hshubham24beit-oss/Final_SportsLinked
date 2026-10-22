const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const emailService = require('./email.service');
const { emitToUser } = require('../sockets');
const {
  EMAIL_PREFERENCE_DEFAULTS,
  EMAIL_PREFERENCE_KEYS,
  NOTIFICATION_EMAIL_CATEGORY,
  USER_STATUS,
} = require('../config/constants');

async function maybeSendEmail(notification) {
  const category = NOTIFICATION_EMAIL_CATEGORY[notification.type];
  if (!category) {
    return;
  }

  const user = await User.findById(notification.user).select(
    'name email status emailPreferences',
  );
  if (
    !user ||
    ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(user.status)
  ) {
    return;
  }

  const preferences = {
    ...EMAIL_PREFERENCE_DEFAULTS,
    ...(user.emailPreferences?.toObject?.() || user.emailPreferences || {}),
  };
  if (!preferences[category]) {
    return;
  }

  try {
    await emailService.sendNotificationEmail(user, notification);
  } catch (error) {
    logger.warn(`Could not send a ${notification.type} notification email`, error);
  }
}

async function createNotification({ userId, type, title, message, link = '', metadata = {} }) {
  if (!userId) {
    return null;
  }

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
    metadata,
  });

  emitToUser(userId, 'notification:new', notification.toJSON());
  await maybeSendEmail(notification);

  return notification;
}

async function listNotifications(userId, query) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const filter = { user: userId };

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications: notifications.map((notification) => ({
      ...notification,
      id: notification._id.toString(),
      _id: undefined,
      __v: undefined,
    })),
    meta: { page, limit, total },
  };
}

async function unreadCount(userId) {
  const count = await Notification.countDocuments({ user: userId, readAt: null });
  return { count };
}

async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );

  if (!notification) {
    throw ApiError.notFound('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  }

  return notification.toJSON();
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );

  return { updated: result.modifiedCount };
}

function normalizeEmailPreferences(user) {
  const stored = user?.emailPreferences?.toObject?.() || user?.emailPreferences || {};
  return Object.fromEntries(
    EMAIL_PREFERENCE_KEYS.map((key) => [
      key,
      stored[key] === undefined ? EMAIL_PREFERENCE_DEFAULTS[key] : Boolean(stored[key]),
    ]),
  );
}

async function getEmailPreferences(userId) {
  const user = await User.findById(userId).select('emailPreferences').lean();
  if (!user) {
    throw ApiError.notFound('Your account could not be found.', 'USER_NOT_FOUND');
  }
  return { preferences: normalizeEmailPreferences(user) };
}

async function updateEmailPreferences(userId, updates) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('Your account could not be found.', 'USER_NOT_FOUND');
  }

  user.emailPreferences = {
    ...normalizeEmailPreferences(user),
    ...updates,
  };
  await user.save();
  return { preferences: normalizeEmailPreferences(user) };
}

module.exports = {
  createNotification,
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllRead,
  getEmailPreferences,
  updateEmailPreferences,
};
