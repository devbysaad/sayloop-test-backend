const prisma = require('../../config/database');

// Create or sync user from Clerk (called on first login)
const syncUser = async (clerkId, { email, firstName, lastName, pfpSource }) => {
  return prisma.user.upsert({
    where: { clerkId },
    update: { email, firstName, lastName, pfpSource },
    create: { clerkId, email, firstName, lastName, pfpSource },
  });
};

// Get user by clerkId (used in middleware)
const getUserByClerkId = async (clerkId) => {
  return prisma.user.findUnique({ where: { clerkId } });
};

// Get user by internal DB id
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return user;
};

// Get full profile with stats
const getMyProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, clerkId: true, username: true,
      firstName: true, lastName: true, email: true,
      pfpSource: true, points: true, streakLength: true,
      currentCourseId: true, createdAt: true, lastSubmission: true,
      currentCourse: { select: { id: true, title: true, imageSrc: true } },
      _count: {
        select: {
          lessonCompletions: true,
          exerciseAttempts: true,
          following: true,
          followers: true,
        },
      },
    },
  });
};

// Update profile fields
const updateProfile = async (userId, { username, firstName, lastName, pfpSource }) => {
  return prisma.user.update({
    where: { id: userId },
    data: { username, firstName, lastName, pfpSource },
  });
};

// Get user stats (XP, streak, lessons, rank)
const getUserStats = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, points: true, streakLength: true, lastSubmission: true },
  });
  if (!user) throw new Error('User not found');

  const [lessonsCompleted, rank] = await prisma.$transaction([
    prisma.lessonCompletion.count({ where: { userId } }),
    prisma.user.count({ where: { points: { gt: user.points } } }),
  ]);

  return {
    points: user.points,
    streakLength: user.streakLength,
    lastSubmission: user.lastSubmission,
    lessonsCompleted,
    rank: rank + 1,
  };
};

// Add XP points to user
const addPoints = async (userId, points) => {
  return prisma.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
  });
};

// Update streak
const updateStreak = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakLength: true, lastSubmission: true },
  });

  const now = new Date();
  const lastSub = user.lastSubmission ? new Date(user.lastSubmission) : null;
  const diffHours = lastSub ? (now - lastSub) / (1000 * 60 * 60) : null;

  let newStreak = user.streakLength;
  if (!lastSub || diffHours >= 48) {
    newStreak = 1; // reset
  } else if (diffHours >= 24) {
    newStreak = user.streakLength + 1; // increment
  }
  // if diffHours < 24 — same day, don't change streak

  return prisma.user.update({
    where: { id: userId },
    data: { streakLength: newStreak, lastSubmission: now },
  });
};

module.exports = {
  syncUser, getUserByClerkId, getUserById,
  getMyProfile, updateProfile, getUserStats,
  addPoints, updateStreak,
};
