const prisma = require('../../config/database');

// ─── Sync (upsert) on every login ─────────────────────────────────────────────
const syncUser = async (clerkId, { email, firstName, lastName, pfpSource }) => {
  return prisma.user.upsert({
    where:  { clerkId },
    update: { email, firstName, lastName, pfpSource },
    create: { clerkId, email, firstName, lastName, pfpSource },
  });
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────
const getUserByClerkId = async (clerkId) => {
  return prisma.user.findUnique({ where: { clerkId } });
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return user;
};

// ─── Full profile ─────────────────────────────────────────────────────────────
const getMyProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, clerkId: true, username: true,
      firstName: true, lastName: true, email: true,
      pfpSource: true, points: true, streakLength: true,
      learningLanguage: true, interests: true,
      currentCourseId: true, createdAt: true, lastSubmission: true,
      currentCourse: { select: { id: true, title: true, imageSrc: true } },
      _count: {
        select: {
          lessonCompletions: true, exerciseAttempts: true,
          following: true, followers: true,
        },
      },
    },
  });
};

// ─── Update profile (including onboarding fields) ─────────────────────────────
const updateProfile = async (userId, { username, firstName, lastName, pfpSource, learningLanguage, interests }) => {
  const data = {};
  if (username         !== undefined) data.username         = username;
  if (firstName        !== undefined) data.firstName        = firstName;
  if (lastName         !== undefined) data.lastName         = lastName;
  if (pfpSource        !== undefined) data.pfpSource        = pfpSource;
  if (learningLanguage !== undefined) data.learningLanguage = learningLanguage;
  if (interests        !== undefined) data.interests        = interests;

  return prisma.user.update({ where: { id: userId }, data });
};

// ─── Browse users (for match page) ───────────────────────────────────────────
// Returns all users except the caller, ordered by points descending.
const getBrowseUsers = async (excludeUserId) => {
  return prisma.user.findMany({
    where: {
      id:        { not: excludeUserId },
      firstName: { not: null },           // skip incomplete/unfinished accounts
    },
    select: {
      id:               true,
      firstName:        true,
      username:         true,
      pfpSource:        true,
      points:           true,
      streakLength:     true,
      learningLanguage: true,
      interests:        true,
    },
    orderBy: { points: 'desc' },
    take: 50,
  });
};

// ─── Stats ────────────────────────────────────────────────────────────────────
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

// ─── Points & streak ──────────────────────────────────────────────────────────
const addPoints = async (userId, points) => {
  return prisma.user.update({
    where: { id: userId },
    data:  { points: { increment: points } },
  });
};

const updateStreak = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakLength: true, lastSubmission: true },
  });

  const now       = new Date();
  const lastSub   = user.lastSubmission ? new Date(user.lastSubmission) : null;
  const diffHours = lastSub ? (now - lastSub) / (1000 * 60 * 60) : null;

  let newStreak = user.streakLength;
  if (!lastSub || diffHours >= 48) newStreak = 1;
  else if (diffHours >= 24)        newStreak += 1;

  return prisma.user.update({
    where: { id: userId },
    data:  { streakLength: newStreak, lastSubmission: now },
  });
};

module.exports = {
  syncUser, getUserByClerkId, getUserById,
  getMyProfile, updateProfile, getBrowseUsers,
  getUserStats, addPoints, updateStreak,
};