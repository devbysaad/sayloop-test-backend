const notificationService = require('./notification.service');
const { success, error }  = require('../../utils/response');

// GET /api/notifications/:userId
const getNotifications = async (req, res) => {
  try {
    const userId        = parseInt(req.params.userId);
    const notifications = await notificationService.getNotifications(userId);
    return success(res, notifications, 'Notifications fetched');
  } catch (err) {
    return error(res, 'Failed to get notifications');
  }
};

// GET /api/notifications/:userId/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const count  = await notificationService.getUnreadCount(userId);
    return success(res, count, 'Unread count fetched');
  } catch (err) {
    return error(res, 'Failed to get unread count');
  }
};

module.exports = { getNotifications, getUnreadCount };
