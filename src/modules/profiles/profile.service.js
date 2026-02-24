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

// Compute match % based on points proximity and streak.
// When nativeLanguage / learningLanguage / topics are added to the schema, extend this.
function computeMatchPercent(requester, candidate) {
  const pointsDiff = Math.abs(requester.points - candidate.points);
  const pointsScore = Math.max(0, 100 - Math.floor(pointsDiff / 200));
  const streakBonus = Math.min(10, Math.floor(candidate.streakLength / 5));
  return Math.min(99, Math.max(60, Math.floor(pointsScore * 0.9 + streakBonus)));
}

// ─── Service ──────────────────────────────────────────────────────────────────
const profilesService = {
  /**
   * GET /api/profiles/search
   * Returns potential partners for a given topic and userId,
   * excluding users already matched/rejected with.
   * NOTE: language/bio/country fields are omitted until those columns exist in the schema.
   */
  async searchPartners({ topic, userId, page = 0, limit = 10 }) {
    const skip = page * limit;

    // Exclude users already in any match with this user (non-expired)
    const usedMatchIds = await prisma.match.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        NOT: { status: 'EXPIRED' },
      },
      select: { requesterId: true, receiverId: true },
    });

    const excludedIds = new Set([userId]);
    usedMatchIds.forEach((m) => {
      excludedIds.add(m.requesterId);
      excludedIds.add(m.receiverId);
    });

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, streakLength: true },
    });

    if (!requester) throw Object.assign(new Error('User not found'), { status: 404 });

    const [total, users] = await Promise.all([
      prisma.user.count({
        where: { id: { notIn: Array.from(excludedIds) } },
      }),
      prisma.user.findMany({
        where: { id: { notIn: Array.from(excludedIds) } },
        skip,
        take: limit,
        orderBy: { points: 'desc' },
        select: {
          id: true, username: true, firstName: true, lastName: true,
          pfpSource: true, points: true, streakLength: true,
        },
      }),
    ]);

    // Return only real DB fields — no fabricated language/bio/country/accuracy
    const partners = users
      .map((u) => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        pfpSource: u.pfpSource,
        points: u.points,
        streakLength: u.streakLength,
        level: getLevel(u.points),
        matchPercent: computeMatchPercent(requester, u),
      }))
      .sort((a, b) => b.matchPercent - a.matchPercent);

    return {
      partners,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    };
  },

  /**
   * GET /api/profiles/:userId/stats
   */
  async getProfileStats(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, streakLength: true },
    });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const rank = await prisma.user.count({ where: { points: { gt: user.points } } });

    const [total, correct] = await Promise.all([
      prisma.exerciseAttempt.count({ where: { userId } }),
      prisma.exerciseAttempt.count({
        where: { userId, option: { isCorrect: true } },
      }),
    ]);

    const lessonsCompleted = await prisma.lessonCompletion.count({ where: { userId } });

    return {
      userId: user.id,
      points: user.points,
      streakLength: user.streakLength,
      level: getLevel(user.points),
      rank: rank + 1,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      lessonsCompleted,
      totalExercises: total,
      correctAnswers: correct,
      debatesWon: 0,
      debatesTotal: 0,
    };
  },

  /**
   * GET /api/profiles/:userId (public profile)
   */
  async getPublicProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, firstName: true, lastName: true,
        pfpSource: true, points: true, streakLength: true, createdAt: true,
      },
    });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const rank = await prisma.user.count({ where: { points: { gt: user.points } } });
    return {
      ...user,
      rank: rank + 1,
      level: getLevel(user.points),
    };
  },
};

module.exports = profilesService;