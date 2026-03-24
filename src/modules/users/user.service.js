const { getDb } = require('../../config/database');

// ─── Sync (upsert) on every login ─────────────────────────────────────────────
const syncUser = async (clerkId, { email, firstName, lastName, pfpSource }) => {
  return getDb((db) => db.user.upsert({
    where: { clerkId },
    update: { email, firstName, lastName, pfpSource },
    create: { clerkId, email, firstName, lastName, pfpSource },
  }));
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────
const getUserByClerkId = async (clerkId) => {
  return getDb((db) => db.user.findUnique({ where: { clerkId } }));
};

const getUserById = async (id) => {
  const user = await getDb((db) => db.user.findUnique({ where: { id } }));
  if (!user) throw new Error('User not found');
  return user;
};

// ─── Full profile ─────────────────────────────────────────────────────────────
const getMyProfile = async (userId) => {
  return getDb((db) => db.user.findUnique({
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
  }));
};

// ─── Update profile (including onboarding fields) ─────────────────────────────
const updateProfile = async (userId, { username, firstName, lastName, pfpSource, learningLanguage, interests }) => {
  const data = {};
  if (username !== undefined) data.username = username;
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (pfpSource !== undefined) data.pfpSource = pfpSource;
  if (learningLanguage !== undefined) data.learningLanguage = learningLanguage;
  if (interests !== undefined) data.interests = interests;

  return getDb((db) => db.user.update({ where: { id: userId }, data }));
};

// ─── Browse users (for match page) ───────────────────────────────────────────
const PENDING_TTL_MS = 5 * 60 * 1000;
const TRANSITION_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;

const getBrowseUsers = async (excludeUserId, onlineUserIds = new Set()) => {
  const onlineIds = [...onlineUserIds].filter(id => id !== excludeUserId);
  if (onlineIds.length === 0) return [];

  const now = Date.now();

  // Auto-cleanup stale matches
  await Promise.all([
    getDb((db) => db.match.updateMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(now - PENDING_TTL_MS) } },
      data: { status: 'EXPIRED' },
    })),
    getDb((db) => db.match.updateMany({
      where: { status: { in: ['ACCEPTED', 'CONFIRMED'] }, createdAt: { lt: new Date(now - TRANSITION_TTL_MS) } },
      data: { status: 'ABANDONED' },
    })),
    getDb((db) => db.match.updateMany({
      where: { status: 'IN_SESSION', createdAt: { lt: new Date(now - SESSION_TTL_MS) } },
      data: { status: 'COMPLETED' },
    })),
  ]);

  // Find who is genuinely busy
  const busyMatches = await getDb((db) => db.match.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { requesterId: { in: onlineIds } },
        { receiverId: { in: onlineIds } },
      ],
    },
    select: { requesterId: true, receiverId: true, status: true, id: true },
  }));

  const onlineIdSet = new Set(onlineIds);
  const busyIds = new Set();
  for (const m of busyMatches) {
    if (onlineIdSet.has(m.requesterId)) busyIds.add(m.requesterId);
    if (onlineIdSet.has(m.receiverId)) busyIds.add(m.receiverId);
  }

  const availableIds = onlineIds.filter(id => !busyIds.has(id));

  console.log(`[Browse] caller=${excludeUserId} onlineIds=${JSON.stringify(onlineIds)} busyMatches=${busyMatches.map(m => `#${m.id}(${m.status} ${m.requesterId}↔${m.receiverId})`).join(',')} busyIds=${[...busyIds]} → availableIds=${JSON.stringify(availableIds)}`);

  if (availableIds.length === 0) return [];

  return getDb((db) => db.user.findMany({
    where: {
      id: { in: availableIds },
      firstName: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      username: true,
      pfpSource: true,
      points: true,
      streakLength: true,
    },
    orderBy: { points: 'desc' },
    take: 50,
  }));
};

// ─── Stats ────────────────────────────────────────────────────────────────────
const getUserStats = async (userId) => {
  const user = await getDb((db) => db.user.findUnique({
    where: { id: userId },
    select: { id: true, points: true, streakLength: true, lastSubmission: true },
  }));
  if (!user) throw new Error('User not found');

  const [lessonsCompleted, rank] = await getDb((db) => db.$transaction([
    db.lessonCompletion.count({ where: { userId } }),
    db.user.count({ where: { points: { gt: user.points } } }),
  ]));

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
  return getDb((db) => db.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
  }));
};

const updateStreak = async (userId) => {
  const user = await getDb((db) => db.user.findUnique({
    where: { id: userId },
    select: { streakLength: true, lastSubmission: true },
  }));

  const now = new Date();
  const lastSub = user.lastSubmission ? new Date(user.lastSubmission) : null;
  const diffHours = lastSub ? (now - lastSub) / (1000 * 60 * 60) : null;

  let newStreak = user.streakLength;
  if (!lastSub || diffHours >= 48) newStreak = 1;
  else if (diffHours >= 24) newStreak += 1;

  return getDb((db) => db.user.update({
    where: { id: userId },
    data: { streakLength: newStreak, lastSubmission: now },
  }));
};

module.exports = {
  syncUser, getUserByClerkId, getUserById,
  getMyProfile, updateProfile, getBrowseUsers,
  getUserStats, addPoints, updateStreak,
};