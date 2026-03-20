/**
 * SayLoop — Economy Controller
 * REST handlers for the economy API endpoints.
 */

const prisma = require('../../config/database');
const { getEconomySummary } = require('./xp.service');
const { spendGems } = require('./gem.service');
const { getTitleForLevel, getProgressToNextLevel } = require('./level.utils');

/**
 * GET /api/economy/summary
 * Returns the authenticated user's full economy state.
 */
async function getSummary(req, res) {
  try {
    const userId = req.dbUserId;
    const summary = await getEconomySummary(userId);
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[Economy] getSummary error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get economy summary' });
  }
}

/**
 * GET /api/economy/transactions?page=1&limit=20
 * Paginated XP transaction history for the authenticated user.
 */
async function getTransactions(req, res) {
  try {
    const userId = req.dbUserId;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      prisma.xPTransaction.count({ where: { userId } }),
      prisma.xPTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, amount: true, reason: true, matchId: true, createdAt: true },
      }),
    ]);

    res.json({
      success: true,
      data: { transactions, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[Economy] getTransactions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
}

/**
 * GET /api/economy/leaderboard
 * Top 50 users by xpThisWeek.
 */
async function getLeaderboard(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xpThisWeek: 'desc' },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        pfpSource: true,
        xpThisWeek: true,
        xp: true,
        level: true,
        streakLength: true,
      },
    });

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      pfpSource: u.pfpSource,
      xpThisWeek: u.xpThisWeek,
      xp: u.xp,
      level: u.level,
      levelTitle: getTitleForLevel(u.level),
      streak: u.streakLength,
    }));

    res.json({ success: true, data: ranked });
  } catch (err) {
    console.error('[Economy] getLeaderboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
  }
}

/**
 * POST /api/economy/spend-gems
 * Body: { itemId: string, cost: number }
 * Deducts gems for a shop purchase.
 */
async function spendGemsHandler(req, res) {
  try {
    const userId = req.dbUserId;
    const { cost } = req.body;

    if (!cost || typeof cost !== 'number' || cost <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cost value' });
    }

    const result = await spendGems(userId, cost);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Not enough gems' });
    }

    res.json({ success: true, data: { newGems: result.newGems } });
  } catch (err) {
    console.error('[Economy] spendGems error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to spend gems' });
  }
}

module.exports = { getSummary, getTransactions, getLeaderboard, spendGemsHandler };
