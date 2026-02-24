const streakService      = require('./streak.service');
const { success, error } = require('../../utils/response');

// GET /api/streaks/:userId
const getStreak = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const streak = await streakService.getStreak(userId);
    return success(res, streak, 'Streak fetched');
  } catch (err) {
    return error(res, err.message || 'Failed to get streak', 404);
  }
};

// POST /api/streaks/:userId/freeze
const freezeStreak = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const result = await streakService.freezeStreak(userId);
    return success(res, result, result.message);
  } catch (err) {
    return error(res, err.message || 'Failed to freeze streak', 400);
  }
};

// POST /api/streaks/:userId/repair
const repairStreak = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const result = await streakService.repairStreak(userId);
    return success(res, result, result.message);
  } catch (err) {
    return error(res, err.message || 'Failed to repair streak', 400);
  }
};

module.exports = { getStreak, freezeStreak, repairStreak };
