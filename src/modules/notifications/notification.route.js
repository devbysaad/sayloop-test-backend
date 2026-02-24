const express                  = require('express');
const router                   = express.Router();
const notificationController   = require('./notification.controller');
const { protect }              = require('../../middleware/auth.middleware');
const paths                    = require('../../config/constants');

router.use(protect);

router.get(paths.GET_NOTIFICATIONS, notificationController.getNotifications);
router.get(paths.GET_UNREAD_COUNT,  notificationController.getUnreadCount);

module.exports = router;
