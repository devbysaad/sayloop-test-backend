const prisma = require('../../config/database');

// Get user's current streak info
const getStreak = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { streakLength: true, lastSubmission: true, points: true },
  });
  if (!user) throw new Error('User not found');

  const now        = new Date();
  const lastSub    = user.lastSubmission ? new Date(user.lastSubmission) : null;
  const diffHours  = lastSub ? (now - lastSub) / (1000 * 60 * 60) : null;
  const isActive   = diffHours !== null && diffHours < 48;
  const isAtRisk   = diffHours !== null && diffHours >= 20 && diffHours < 48;

  return {
    streakLength:   user.streakLength,
    lastSubmission: user.lastSubmission,
    isActive,
    isAtRisk,      // True when streak might break soon — trigger notification
    practicedToday: diffHours !== null && diffHours < 24,
  };
};

// Freeze streak (spends gems) — protects streak when user misses a day
const freezeStreak = async (userId) => {
  const FREEZE_COST = 10; // gems

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { points: true },
  });
  if (!user) throw new Error('User not found');

  // Deduct gem cost from points (gems = points for simplicity)
  if (user.points < FREEZE_COST) throw new Error('Not enough gems to freeze streak');

  // Extend lastSubmission by 24h so streak stays alive
  const extended = new Date();
  extended.setHours(extended.getHours() + 24);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data:  {
        points:        { decrement: FREEZE_COST },
        lastSubmission: extended,
      },
    }),
  ]);

  return { message: 'Streak frozen for 24 hours', gemsCost: FREEZE_COST };
};

// Repair streak (spends gems) — restores a broken streak
const repairStreak = async (userId) => {
  const REPAIR_COST = 25; // gems

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { points: true, streakLength: true },
  });
  if (!user) throw new Error('User not found');
  if (user.points < REPAIR_COST) throw new Error('Not enough gems to repair streak');

  const restored = new Date();
  restored.setHours(restored.getHours() - 12); // set lastSubmission to 12h ago

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data:  {
        points:         { decrement: REPAIR_COST },
        lastSubmission: restored,
        streakLength:   { increment: 1 },
      },
    }),
  ]);

  return { message: 'Streak repaired', gemsCost: REPAIR_COST, newStreak: user.streakLength + 1 };
};

module.exports = { getStreak, freezeStreak, repairStreak };
