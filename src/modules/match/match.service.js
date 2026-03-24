const { getDb } = require('../../config/database');

const MATCH_TTL_MS = 5 * 60 * 1000;

const matchesService = {

  async requestMatch({ userId, partnerId, topic }) {
    if (userId === partnerId) {
      throw Object.assign(new Error('Cannot match with yourself'), { status: 400 });
    }

    // Verify both users exist
    const [requester, receiver] = await Promise.all([
      getDb((db) => db.user.findUnique({ where: { id: userId }, select: { id: true } })),
      getDb((db) => db.user.findUnique({ where: { id: partnerId }, select: { id: true } })),
    ]);

    if (!requester) {
      throw Object.assign(new Error('Your user account was not found. Please refresh and try again.'), { status: 404 });
    }
    if (!receiver) {
      throw Object.assign(new Error('The selected partner was not found. They may have deleted their account.'), { status: 404 });
    }

    // Check for existing PENDING match between these users
    const existing = await getDb((db) => db.match.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { requesterId: userId, receiverId: partnerId },
          { requesterId: partnerId, receiverId: userId },
        ],
      },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
      },
    }));

    if (existing) {
      // If it's still pending, return it — don't create a duplicate
      return existing;
    }

    // Mark any stale matches between these two users as ABANDONED
    await getDb((db) => db.match.updateMany({
      where: {
        status: { in: ['ACCEPTED', 'CONFIRMED', 'IN_SESSION'] },
        OR: [
          { requesterId: userId, receiverId: partnerId },
          { requesterId: partnerId, receiverId: userId },
        ],
      },
      data: { status: 'ABANDONED' },
    }));

    const match = await getDb((db) => db.match.create({
      data: { requesterId: userId, receiverId: partnerId, topic, status: 'PENDING' },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
      },
    }));

    return match;
  },

  async acceptMatch(matchId, userId) {
    // Atomic: only update if status is still PENDING — prevents race conditions
    const updated = await getDb((db) => db.match.updateMany({
      where: { id: matchId, receiverId: userId, status: 'PENDING' },
      data: { status: 'ACCEPTED', sessionId: `session_${matchId}_${Date.now()}` },
    }));

    if (updated.count === 0) {
      // Figure out why it failed for a better error message
      const match = await getDb((db) => db.match.findUnique({ where: { id: matchId } }));
      if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });
      if (match.receiverId !== userId) throw Object.assign(new Error('Not authorised'), { status: 403 });
      if (match.status !== 'PENDING') throw Object.assign(new Error('Match is no longer pending'), { status: 409 });
      throw Object.assign(new Error('Failed to accept match'), { status: 500 });
    }

    // Fetch the full updated match with relations
    const match = await getDb((db) => db.match.findUnique({
      where: { id: matchId },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
      },
    }));

    return match;
  },

  async rejectMatch(matchId, userId) {
    const updated = await getDb((db) => db.match.updateMany({
      where: { id: matchId, receiverId: userId, status: 'PENDING' },
      data: { status: 'REJECTED' },
    }));

    if (updated.count === 0) {
      const match = await getDb((db) => db.match.findUnique({ where: { id: matchId } }));
      if (!match) throw Object.assign(new Error('Match not found'), { status: 404 });
      if (match.receiverId !== userId) throw Object.assign(new Error('Not authorised'), { status: 403 });
      if (match.status !== 'PENDING') throw Object.assign(new Error('Match is no longer pending'), { status: 409 });
      throw Object.assign(new Error('Failed to reject match'), { status: 500 });
    }

    return { matchId, status: 'rejected' };
  },

  async getActiveMatches(userId) {
    const matches = await getDb((db) => db.match.findMany({
      where: {
        status: { in: ['PENDING', 'ACCEPTED', 'CONFIRMED'] },
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
        receiver: { select: { id: true, username: true, firstName: true, pfpSource: true, points: true } },
      },
    }));

    return matches.map(m => ({ ...m, status: m.status.toLowerCase() }));
  },

  async getMatchHistory(userId, page = 0, limit = 20) {
    const skip = page * limit;
    const where = {
      status: { in: ['COMPLETED', 'REJECTED', 'EXPIRED', 'ABANDONED'] },
      OR: [{ requesterId: userId }, { receiverId: userId }],
    };

    const [total, matches] = await Promise.all([
      getDb((db) => db.match.count({ where })),
      getDb((db) => db.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, username: true, firstName: true, pfpSource: true } },
          receiver: { select: { id: true, username: true, firstName: true, pfpSource: true } },
        },
      })),
    ]);

    return {
      data: matches.map(m => ({ ...m, status: m.status.toLowerCase() })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async completeMatch(sessionId) {
    const match = await getDb((db) => db.match.findFirst({
      where: { sessionId, status: { in: ['ACCEPTED', 'CONFIRMED', 'IN_SESSION'] } },
    }));
    if (!match) return null;
    return getDb((db) => db.match.update({ where: { id: match.id }, data: { status: 'COMPLETED' } }));
  },
};

module.exports = matchesService;