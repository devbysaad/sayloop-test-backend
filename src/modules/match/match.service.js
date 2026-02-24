const prisma = require('../../config/database');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = { Diamond: 10000, Gold: 5000, Silver: 2000, Bronze: 500 };

function getLevel(points) {
  if (points >= LEVEL_THRESHOLDS.Diamond) return 'Diamond';
  if (points >= LEVEL_THRESHOLDS.Gold) return 'Gold';
  if (points >= LEVEL_THRESHOLDS.Silver) return 'Silver';
  if (points >= LEVEL_THRESHOLDS.Bronze) return 'Bronze';
  return 'Rookie';
}

// Expiry: pending matches older than 5 minutes are auto-expired
const MATCH_TTL_MS = 5 * 60 * 1000;

// ─── Service ──────────────────────────────────────────────────────────────────
const matchesService = {
  /**
   * Creates a new match request. Prevents duplicate pending requests.
   */
  async requestMatch({ userId, partnerId, topic }) {
    if (userId === partnerId) {
      throw Object.assign(new Error('Cannot match with yourself'), { status: 400 });
    }

    // Check for existing pending match between these users
    const existing = await prisma.match.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { requesterId: userId, receiverId: partnerId },
          { requesterId: partnerId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      // If it was expired, delete and recreate
      const age = Date.now() - existing.createdAt.getTime();
      if (age > MATCH_TTL_MS) {
        await prisma.match.update({ where: { id: existing.id }, data: { status: 'EXPIRED' } });
      } else {
        return existing;
      }
    }

    const match = await prisma.match.create({
      data: { requesterId: userId, receiverId: partnerId, topic, status: 'PENDING' },
    });

    return {
      matchId: match.id,
      partnerId: match.receiverId,
      topic: match.topic,
      status: match.status.toLowerCase(),
    };
  },

  /**
   * Accept a match request. Returns the match with session context.
   */
  async acceptMatch(matchId, userId) {
    const match = await prisma.match.findUnique({ where: { id: matchId } });

    if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });
    if (match.receiverId !== userId) throw Object.assign(new Error('Not authorised'), { status: 403 });
    if (match.status !== 'PENDING') throw Object.assign(new Error('Match is no longer pending'), { status: 409 });

    // Check TTL
    const age = Date.now() - match.createdAt.getTime();
    if (age > MATCH_TTL_MS) {
      await prisma.match.update({ where: { id: matchId }, data: { status: 'EXPIRED' } });
      throw Object.assign(new Error('Match request expired'), { status: 410 });
    }

    const sessionId = `session_${matchId}_${Date.now()}`;
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'ACCEPTED', sessionId },
    });

    return {
      matchId: updated.id,
      sessionId: updated.sessionId,
      topic: updated.topic,
      requesterId: updated.requesterId,
      receiverId: updated.receiverId,
    };
  },

  /**
   * Reject a match request.
   */
  async rejectMatch(matchId, userId) {
    const match = await prisma.match.findUnique({ where: { id: matchId } });

    if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });
    if (match.receiverId !== userId) throw Object.assign(new Error('Not authorised'), { status: 403 });
    if (match.status !== 'PENDING') throw Object.assign(new Error('Match is no longer pending'), { status: 409 });

    await prisma.match.update({ where: { id: matchId }, data: { status: 'REJECTED' } });
    return { matchId, status: 'rejected' };
  },

  /**
   * Get all active (pending or accepted) matches for a user.
   */
  async getActiveMatches(userId) {
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['PENDING', 'ACCEPTED'] },
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
      },
    });

    return matches.map((m) => ({
      ...m,
      status: m.status.toLowerCase(),
    }));
  },

  /**
   * Get match history (completed/rejected/expired) for a user.
   */
  async getMatchHistory(userId, page = 0, limit = 20) {
    const skip = page * limit;
    const where = {
      status: { in: ['COMPLETED', 'REJECTED', 'EXPIRED'] },
      OR: [{ requesterId: userId }, { receiverId: userId }],
    };

    const [total, matches] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, username: true, firstName: true, pfpSource: true } },
          receiver: { select: { id: true, username: true, firstName: true, pfpSource: true } },
        },
      }),
    ]);

    return {
      data: matches.map((m) => ({ ...m, status: m.status.toLowerCase() })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Mark a match as COMPLETED (called after session ends).
   */
  async completeMatch(sessionId) {
    const match = await prisma.match.findFirst({ where: { sessionId, status: 'ACCEPTED' } });
    if (!match) return null;
    return prisma.match.update({ where: { id: match.id }, data: { status: 'COMPLETED' } });
  },
};

module.exports = matchesService;