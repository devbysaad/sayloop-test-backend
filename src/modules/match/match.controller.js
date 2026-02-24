const matchesService = require('./match.service');

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/matches/find
 * Body: { userId, partnerId, topic }
 */
const requestMatch = async (req, res) => {
  try {
    const result = await matchesService.requestMatch(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/matches/:matchId/accept
 * Requires authenticated userId in req.user or body
 */
const acceptMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    // userId comes from Clerk middleware (req.auth.userId mapped to db id)
    const userId = req.dbUserId;
    const result = await matchesService.acceptMatch(Number(matchId), userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/matches/:matchId/reject
 */
const rejectMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.dbUserId;
    const result = await matchesService.rejectMatch(Number(matchId), userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/matches/active?userId=123
 */
const getActiveMatches = async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const result = await matchesService.getActiveMatches(userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/matches/history?userId=123&page=0&limit=20
 */
const getMatchHistory = async (req, res) => {
  try {
    const { userId, page, limit } = req.query;
    const result = await matchesService.getMatchHistory(
      Number(userId),
      Number(page ?? 0),
      Number(limit ?? 20),
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/matches/:matchId
 */
const getMatchById = async (req, res) => {
  try {
    const prisma = require('../../config/database');
    const match = await prisma.match.findUnique({
      where: { id: Number(req.params.matchId) },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true } },
      },
    });
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    return res.status(200).json({ success: true, data: { ...match, status: match.status.toLowerCase() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  requestMatch,
  acceptMatch,
  rejectMatch,
  getActiveMatches,
  getMatchHistory,
  getMatchById,
};