const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { clerkAuth, protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { syncUserSchema, updateProfileSchema } = require('./user.validation');
const paths = require('../../config/constants');

// SYNC: clerkAuth only — resolveDbUser cannot run before the user exists in DB
router.post(paths.SYNC_USER, clerkAuth, validate(syncUserSchema), userController.syncUser);

// All other user routes require full protect (clerkAuth + resolveDbUser)
router.get(paths.GET_ME, protect, userController.getMe);
router.put(paths.UPDATE_ME, protect, validate(updateProfileSchema), userController.updateMe);
router.get(paths.GET_MY_STATS, protect, userController.getMyStats);

module.exports = router;
