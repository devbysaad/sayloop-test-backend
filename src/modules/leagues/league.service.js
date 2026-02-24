const prisma = require('../../config/database');
const { LEAGUES, getLeagueByXP } = require('../../utils/league');

// Get all league tiers (static data)
const getAllLeagues = async () => LEAGUES;

// Get the user's current league based on XP
const getUserLeague = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, points: true, username: true, pfpSource: true },
  });
  if (!user) throw new Error('User not found');

  const league      = getLeagueByXP(user.points);
  const leagueIndex = LEAGUES.findIndex((l) => l.name === league.name);
  const nextLeague  = LEAGUES[leagueIndex + 1] ?? null;

  return {
    userId:          user.id,
    username:        user.username,
    points:          user.points,
    currentLeague:   league,
    nextLeague,
    xpToNextLeague:  nextLeague ? nextLeague.minXP - user.points : 0,
  };
};

// Get top users in a specific league tier (users whose XP falls in that range)
const getLeagueMembers = async (leagueName, page = 0, limit = 20) => {
  const league = LEAGUES.find((l) => l.name.toLowerCase() === leagueName.toLowerCase());
  if (!league) throw new Error('League not found');

  const leagueIndex = LEAGUES.findIndex((l) => l.name === league.name);
  const nextLeague  = LEAGUES[leagueIndex + 1];

  const users = await prisma.user.findMany({
    where: {
      points: {
        gte: league.minXP,
        ...(nextLeague ? { lt: nextLeague.minXP } : {}),
      },
    },
    orderBy: [{ points: 'desc' }, { id: 'asc' }],
    skip: page * limit,
    take: limit,
    select: { id: true, username: true, firstName: true, lastName: true, pfpSource: true, points: true, streakLength: true },
  });

  return users.map((u, i) => ({ rank: page * limit + i + 1, ...u }));
};

// Get weekly standings (top users by XP this week) — simplified version
const getWeeklyStandings = async (limit = 20) => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // start of this week
  weekStart.setHours(0, 0, 0, 0);

  // Count XP earned this week via lesson completions
  const completions = await prisma.lessonCompletion.groupBy({
    by:     ['userId'],
    where:  { completedAt: { gte: weekStart } },
    _sum:   { score: true },
    orderBy:{ _sum: { score: 'desc' } },
    take:   limit,
  });

  const userIds = completions.map((c) => c.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, username: true, firstName: true, lastName: true, pfpSource: true, points: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return completions.map((c, i) => ({
    rank:     i + 1,
    weeklyXP: c._sum.score ?? 0,
    ...userMap[c.userId],
  }));
};

module.exports = { getAllLeagues, getUserLeague, getLeagueMembers, getWeeklyStandings };
