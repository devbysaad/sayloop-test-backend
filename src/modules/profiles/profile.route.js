const express = require('express');
const router = express.Router();

const controller = require('./profile.controller');
const {
  validate,
  searchPartnersSchema,
  getProfileStatsSchema,
  getPublicProfileSchema,
  updateBioSchema,
} = require('./profile.validation');
const { requireAuth } = require('../../middleware/auth.middleware');

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET  /api/profiles/search          → search potential partners (must be before /:userId)
router.get(
  '/search',
  requireAuth,
  validate(searchPartnersSchema),
  controller.searchPartners,
);

// GET  /api/profiles/:userId/stats   → profile stats for a specific user
router.get(
  '/:userId/stats',
  requireAuth,
  validate(getProfileStatsSchema),
  controller.getProfileStats,
);

// GET  /api/profiles/:userId         → public profile
router.get(
  '/:userId',
  validate(getPublicProfileSchema),
  controller.getPublicProfile,
);

module.exports = router;