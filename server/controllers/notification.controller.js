const notificationService = require('../services/notification.service');
const { success, paginated } = require('../utils/apiResponse');

async function listNotifications(req, res) {
  const result = await notificationService.listNotifications(req.user._id, req.query);
  return paginated(res, {
    data: { notifications: result.notifications },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Notifications retrieved.',
  });
}

async function unreadCount(req, res) {
  const result = await notificationService.unreadCount(req.user._id);
  return success(res, { data: result, message: 'Unread count retrieved.' });
}

async function markRead(req, res) {
  const notification = await notificationService.markNotificationRead(
    req.user._id,
    req.params.id,
  );
  return success(res, { data: { notification }, message: 'Notification marked as read.' });
}

async function markAllRead(req, res) {
  const result = await notificationService.markAllRead(req.user._id);
  return success(res, { data: result, message: 'All notifications marked as read.' });
}

async function getPreferences(req, res) {
  const result = await notificationService.getEmailPreferences(req.user._id);
  return success(res, {
    data: result,
    message: 'Email notification preferences retrieved.',
  });
}

async function updatePreferences(req, res) {
  const result = await notificationService.updateEmailPreferences(
    req.user._id,
    req.body,
  );
  return success(res, {
    data: result,
    message: 'Email notification preferences updated.',
  });
}

module.exports = {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
};
