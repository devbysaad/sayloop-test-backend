const express    = require('express');
const router     = express.Router();
const controller = require('./profile.controller');
const { validate } = require('../../middleware/validate.middleware');
const {
  searchPartnersSchema,
  getProfileStatsSchema,
  getPublicProfileSchema,
} = require('./profile.validation');
const { protect } = require('../../middleware/auth.middleware');

// GET /api/profiles/search  — must be declared BEFORE /:userId to avoid route shadowing
router.get('/search',
  protect,
  validate(searchPartnersSchema),
  controller.searchPartners,
);

// GET /api/profiles/:userId/stats
router.get('/:userId/stats',
  protect,
  validate(getProfileStatsSchema),
  controller.getProfileStats,
);

// GET /api/profiles/:userId  — public, no auth required
router.get('/:userId',
  validate(getPublicProfileSchema),
  controller.getPublicProfile,
);

module.exports = router;