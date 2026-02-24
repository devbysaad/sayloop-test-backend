const express = require('express');
const router = express.Router();

const controller = require('./match.controller');
const { protect } = require('../../middleware/auth.middleware');
const {
  validate,
  findMatchSchema,
  matchIdParamSchema,
  getActiveMatchesSchema,
  getMatchHistorySchema,
} = require('./match.validation');

// POST   /api/matches/find          → create match request
router.post(
  '/find',
  protect,
  validate(findMatchSchema),
  controller.requestMatch,
);

// GET    /api/matches/active         → list active matches for a user
router.get(
  '/active',
  protect,
  validate(getActiveMatchesSchema),
  controller.getActiveMatches,
);

// GET    /api/matches/history        → match history (paginated)
router.get(
  '/history',
  protect,
  validate(getMatchHistorySchema),
  controller.getMatchHistory,
);

// GET    /api/matches/:matchId        → get single match
router.get(
  '/:matchId',
  protect,
  validate(matchIdParamSchema),
  controller.getMatchById,
);

// POST   /api/matches/:matchId/accept
router.post(
  '/:matchId/accept',
  protect,
  validate(matchIdParamSchema),
  controller.acceptMatch,
);

// POST   /api/matches/:matchId/reject
router.post(
  '/:matchId/reject',
  protect,
  validate(matchIdParamSchema),
  controller.rejectMatch,
);

module.exports = router;