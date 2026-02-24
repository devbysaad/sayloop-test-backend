// ─── leaderboard.controller.js ───────────────────────────────────────────────
const leaderboardService = require('./leaderboard.service');

const getPaginated = async (req, res) => {
  try {
    const page  = Number(req.query.page  ?? 0);
    const limit = Number(req.query.limit ?? 20);
    const data  = await leaderboardService.getPaginated(page, limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};

const getTop = async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const data  = await leaderboardService.getTop(limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getUserRank = async (req, res) => {
  try {
    const data = await leaderboardService.getUserRank(Number(req.params.userId));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};

module.exports = { getPaginated, getTop, getUserRank };