const express           = require('express');
const router            = express.Router();
const adminController   = require('./admin.controller');
const { protect, adminOnly } = require('../../middleware/auth.middleware');
const paths             = require('../../config/constants');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get(paths.GET_ALL_USERS_ADMIN, adminController.getAllUsers);
router.get(paths.GET_SYSTEM_STATS,    adminController.getSystemStats);
router.post('/reset/:userId',         adminController.resetUserPoints);

module.exports = router;
