// BUG FIXED: was doing `new PrismaClient()` — use the singleton instead
const prisma = require('../../config/database');

const leaderboardService = {
  async getPaginated(page = 0, limit = 20) {
    const skip = page * limit;
    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: [{ points: 'desc' }, { id: 'asc' }],
        select: {
          id: true, username: true, firstName: true,
          lastName: true, pfpSource: true, points: true, streakLength: true,
        },
      }),
    ]);
    return {
      data: users.map((u, i) => ({ ...u, rank: skip + i + 1 })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getUserRank(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, streakLength: true },
    });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const higherCount = await prisma.user.count({ where: { points: { gt: user.points } } });
    return {
      userId: user.id,
      rank: higherCount + 1,
      points: user.points,
      streakLength: user.streakLength,
    };
  },

  async getTop(limit = 10) {
    const users = await prisma.user.findMany({
      take: limit,
      orderBy: [{ points: 'desc' }, { id: 'asc' }],
      select: {
        id: true, username: true, firstName: true,
        pfpSource: true, points: true, streakLength: true,
      },
    });
    return users.map((u, i) => ({ ...u, rank: i + 1 }));
  },
};

module.exports = leaderboardService;