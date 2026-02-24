const express = require('express');
const router = express.Router();
const leaderboardController = require('./leaderboard.controller');
const { protect, requireAuth } = require('../../middleware/auth.middleware');

// GET /api/leaderboard/paginated?page=0&limit=20
router.get('/paginated', requireAuth, leaderboardController.getPaginated);

// GET /api/leaderboard/top?limit=10
// Authenticated — prevent PII leak of user IDs and streak data (audit: H-4)
router.get('/top', protect, leaderboardController.getTop);

// GET /api/leaderboard/rank/:userId
router.get('/rank/:userId', requireAuth, leaderboardController.getUserRank);

module.exports = router;