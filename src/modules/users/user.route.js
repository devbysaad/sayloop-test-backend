const express    = require('express');
const router     = express.Router();
const controller = require('./user.controller');
const { clerkAuth, protect } = require('../../middleware/auth.middleware');
const { validate }           = require('../../middleware/validate.middleware');
const { syncUserSchema, updateProfileSchema } = require('./user.validation');

// POST /api/users/sync
// clerkAuth only — resolveDbUser cannot run before the user exists in DB yet
router.post('/sync',
  clerkAuth,
  validate(syncUserSchema),
  controller.syncUser,
);

// GET /api/users/me
router.get('/me',
  protect,
  controller.getMe,
);

// PUT /api/users/me
router.put('/me',
  protect,
  validate(updateProfileSchema),
  controller.updateMe,
);

// GET /api/users/me/stats
router.get('/me/stats',
  protect,
  controller.getMyStats,
);

// GET /api/users/browse
// Returns other real users for the match browse tab.
// Must come BEFORE any /:id route to avoid being caught as a param.
router.get('/browse',
  protect,
  controller.browseUsers,
);

module.exports = router;