/**
 * SayLoop — Economy Routes
 *
 * GET  /api/economy/summary            → authenticated user's economy state
 * GET  /api/economy/transactions       → paginated XP history
 * GET  /api/economy/leaderboard        → top 50 by xpThisWeek
 * POST /api/economy/spend-gems         → deduct gems for shop purchase
 */

const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  getSummary,
  getTransactions,
  getLeaderboard,
  spendGemsHandler,
} = require('./economy.controller');

const router = Router();

router.use(requireAuth);

router.get('/summary',      getSummary);
router.get('/transactions', getTransactions);
router.get('/leaderboard',  getLeaderboard);
router.post('/spend-gems',  spendGemsHandler);

module.exports = router;
