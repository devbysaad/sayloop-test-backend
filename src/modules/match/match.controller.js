const matchesService = require('./match.service');
const { emitToUser } = require('./match.socket');
const { getDb } = require('../../config/database');

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/matches/find
 * Body: { userId, partnerId, topic }
 */
const requestMatch = async (req, res) => {
  try {
    const result = await matchesService.requestMatch(req.body);
    const io = req.app.get('io');

    // Emit real-time notification to the receiver
    if (io && result.status === 'PENDING') {
      const roomMatch = `page:match:user:${result.receiverId}`;
      const roomHome = `page:home:user:${result.receiverId}`;

      const receiverIsOnMatchPage = io.sockets.adapter.rooms.has(roomMatch);
      const receiverIsOnHomePage = io.sockets.adapter.rooms.has(roomHome);

      if (receiverIsOnMatchPage || receiverIsOnHomePage) {
        // Emit live popup only if they are on /match or /home
        io.to(roomMatch).to(roomHome).emit('match:request-received', {
          matchId: result.id,
          topic: result.topic,
          requester: result.requester,
        });
      } else {
        // Just emit a badge count update to their general user room
        const pendingCount = await getDb((db) => db.match.count({
          where: { receiverId: result.receiverId, status: 'PENDING' },
        }));
        io.to(`user:${result.receiverId}`).emit('match:badge_count', {
          pendingRequests: pendingCount,
        });
      }
    }

    return res.status(201).json({
      success: true, data: {
        matchId: result.id,
        partnerId: result.receiverId,
        topic: result.topic,
        status: result.status.toLowerCase(),
      }
    });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/matches/:matchId/accept
 * Requires authenticated userId in req.dbUserId
 */
const acceptMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.dbUserId;
    const result = await matchesService.acceptMatch(Number(matchId), userId);
    const io = req.app.get('io');

    // Emit match:accepted to BOTH users
    if (io && result) {
      const payload = {
        matchId: result.id,
        sessionId: result.sessionId,
        topic: result.topic,
        requester: result.requester,
        receiver: result.receiver,
      };
      emitToUser(io, result.requesterId, 'match:accepted', payload);
      emitToUser(io, result.receiverId, 'match:accepted', payload);
    }

    return res.status(200).json({
      success: true, data: {
        matchId: result.id,
        sessionId: result.sessionId,
        topic: result.topic,
        requesterId: result.requesterId,
        receiverId: result.receiverId,
      }
    });
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

    // Get the match first so we know who the requester is
    const { getDb: getDbLocal } = require('../../config/database');
    const match = await getDbLocal((db) => db.match.findUnique({ where: { id: Number(matchId) } }));

    const result = await matchesService.rejectMatch(Number(matchId), userId);
    const io = req.app.get('io');

    // Notify the requester that their match was rejected
    if (io && match) {
      emitToUser(io, match.requesterId, 'match:rejected', { matchId: Number(matchId) });
    }

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
    const match = await getDb((db) => db.match.findUnique({
      where: { id: Number(req.params.matchId) },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true } },
      },
    }));
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