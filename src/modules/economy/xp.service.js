/**
 * SayLoop — XP Service
 * Central service for all XP changes, level-up detection, streak tracking.
 *
 * XP Rules:
 *  Win    → +25 XP base (+5 bonus if opponent is higher level)
 *  Draw   → 0 XP
 *  Resign → -15 XP (floor at 0)
 *  First session of day → +5 XP bonus
 *  Complete 5 sessions in a day → +10 XP streak reward (once/day)
 *  Streak maintained (login + session) → +5 XP/day
 *  Level up → +20 XP bonus
 */

const prisma = require('../../config/database');
const { getLevelForXP, getTitleForLevel, LEVEL_UP_GEMS, getProgressToNextLevel } = require('./level.utils');
const { awardGems, checkStreakMilestone } = require('./gem.service');

/**
 * Apply an XP delta to a user. Floors at 0. Logs XPTransaction. Checks level-up.
 * @param {number} userId
 * @param {number} amount      — positive or negative
 * @param {string} reason      — XPReason enum value
 * @param {number|null} matchId
 * @param {object|null} io     — Socket.IO server instance for level_up event
 * @returns {Promise<{ newXP, newLevel, levelledUp, oldLevel, gemsFromLevelUp }>}
 */
async function applyXP(userId, amount, reason, matchId = null, io = null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, xpThisWeek: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  const oldXP = user.xp;
  const oldLevel = user.level;
  const rawNew = oldXP + amount;
  const newXP = Math.max(0, rawNew); // floor at 0
  const actualAmount = newXP - oldXP; // what was actually applied

  // New level based on xp (never goes down)
  const xpBasedLevel = getLevelForXP(newXP);
  const newLevel = Math.max(oldLevel, xpBasedLevel); // level never drops
  const levelledUp = newLevel > oldLevel;

  // Persist XP, level, weekly XP
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel,
      xpThisWeek: { increment: Math.max(0, actualAmount) },
      xpTransactions: {
        create: {
          amount: actualAmount,
          reason,
          ...(matchId ? { matchId } : {}),
        },
      },
    },
  });

  let gemsFromLevelUp = 0;

  if (levelledUp) {
    // Award level-up XP bonus (+20 XP) — does not trigger another level-up chain
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: 20 },
        xpTransactions: { create: { amount: 20, reason: 'LEVEL_UP_BONUS' } },
      },
    });

    // Award level-up gems if applicable
    const gemBonus = LEVEL_UP_GEMS[newLevel];
    if (gemBonus) {
      await awardGems(userId, gemBonus, 'LEVEL_UP');
      gemsFromLevelUp = gemBonus;
    }

    // Emit level_up socket event to user's room
    if (io) {
      io.to(`user:${userId}`).emit('level_up', {
        oldLevel,
        newLevel,
        newTitle: getTitleForLevel(newLevel),
        gemsEarned: gemsFromLevelUp,
      });
    }

    console.log(`[XP] userId=${userId} LEVELLED UP ${oldLevel} → ${newLevel} (+20 bonus, +${gemsFromLevelUp} gems)`);
  }

  console.log(`[XP] userId=${userId} ${amount >= 0 ? '+' : ''}${actualAmount} (${reason}) ${oldXP} → ${newXP} level=${newLevel}`);

  return { newXP, newLevel, levelledUp, oldLevel, gemsFromLevelUp };
}

/**
 * Update streak for a user after session completion.
 * Increments streak if user hasn't already completed a session today (UTC).
 * @param {number} userId
 * @returns {Promise<{ newStreak: number, streakIncremented: boolean, isFirstSessionToday: boolean }>}
 */
async function updateStreak(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakLength: true, lastActiveDate: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  const nowUTC = new Date();
  const todayUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()));

  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  const lastActiveDay = lastActive
    ? new Date(Date.UTC(lastActive.getUTCFullYear(), lastActive.getUTCMonth(), lastActive.getUTCDate()))
    : null;

  const isSameDay = lastActiveDay && lastActiveDay.getTime() === todayUTC.getTime();
  const isFirstSessionToday = !isSameDay;

  let newStreak = user.streakLength;

  if (!isSameDay) {
    // Determine if yesterday was the last active day (streak continues)
    const yesterday = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
    const wasYesterday = lastActiveDay && lastActiveDay.getTime() === yesterday.getTime();

    if (wasYesterday || !lastActiveDay) {
      // Increment streak
      newStreak = user.streakLength + 1;
    } else {
      // Gap > 1 day — reset streak
      newStreak = 1;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { streakLength: newStreak, lastActiveDate: nowUTC },
    });
  }

  return { newStreak, streakIncremented: isFirstSessionToday, isFirstSessionToday };
}

/**
 * Get full economy summary for a user.
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function getEconomySummary(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      gems: true,
      level: true,
      streakLength: true,
      totalMatches: true,
      totalWins: true,
      totalDraws: true,
      totalResigns: true,
      xpThisWeek: true,
      xpTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, amount: true, reason: true, matchId: true, createdAt: true },
      },
    },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  const progress = getProgressToNextLevel(user.xp);

  return {
    xp: user.xp,
    gems: user.gems,
    level: user.level,
    levelTitle: getTitleForLevel(user.level),
    streak: user.streakLength,
    totalMatches: user.totalMatches,
    totalWins: user.totalWins,
    totalDraws: user.totalDraws,
    totalResigns: user.totalResigns,
    xpThisWeek: user.xpThisWeek,
    nextLevelProgress: progress,
    recentTransactions: user.xpTransactions,
  };
}

/**
 * Process the full economy update for a completed session matchup.
 * Determines winner/loser from outcome, applies XP, gem milestones, and streaks.
 *
 * @param {number} requesterId
 * @param {number} receiverId
 * @param {string} outcome    — MatchOutcome enum value
 * @param {number|null} matchId
 * @param {object|null} io    — Socket.IO server instance
 * @returns {Promise<{ requester: EconomyUpdate, receiver: EconomyUpdate }>}
 */
async function processSessionEconomy(requesterId, receiverId, outcome, matchId = null, io = null) {
  const results = {};

  // Determine XP deltas
  let requesterXP = 0;
  let receiverXP = 0;
  let requesterReason = 'DRAW';
  let receiverReason = 'DRAW';
  let requesterWon = false;
  let receiverWon = false;
  let requesterResigned = false;
  let receiverResigned = false;

  switch (outcome) {
    case 'WIN_REQUESTER':
      requesterXP = 25;   requesterReason = 'WIN';    requesterWon = true;
      receiverXP = 0;     receiverReason = 'DRAW';
      break;
    case 'WIN_RECEIVER':
      requesterXP = 0;    requesterReason = 'DRAW';
      receiverXP = 25;    receiverReason = 'WIN';     receiverWon = true;
      break;
    case 'RESIGN_REQUESTER':
      requesterXP = -15;  requesterReason = 'RESIGN'; requesterResigned = true;
      receiverXP = 25;    receiverReason = 'WIN';     receiverWon = true;
      break;
    case 'RESIGN_RECEIVER':
      requesterXP = 25;   requesterReason = 'WIN';    requesterWon = true;
      receiverXP = -15;   receiverReason = 'RESIGN';  receiverResigned = true;
      break;
    case 'DRAW':
    default:
      // 0 XP each
      break;
  }

  // Check if either winner gets +5 level bonus (opponent is higher level)
  const [reqUser, recUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { level: true, totalMatches: true, totalWins: true, totalDraws: true, totalResigns: true } }),
    prisma.user.findUnique({ where: { id: receiverId }, select: { level: true, totalMatches: true, totalWins: true, totalDraws: true, totalResigns: true } }),
  ]);

  if (requesterWon && recUser && reqUser && recUser.level > reqUser.level) {
    requesterXP += 5; // bonus for beating a higher level opponent
  }
  if (receiverWon && reqUser && recUser && reqUser.level > recUser.level) {
    receiverXP += 5;
  }

  // ── Apply XP ──────────────────────────────────────────────────────────────
  const [reqXPResult, recXPResult] = await Promise.all([
    requesterXP !== 0
      ? applyXP(requesterId, requesterXP, requesterReason, matchId, io)
      : Promise.resolve({ newXP: reqUser?.xp ?? 0, newLevel: reqUser?.level ?? 1, levelledUp: false, oldLevel: reqUser?.level ?? 1, gemsFromLevelUp: 0 }),
    receiverXP !== 0
      ? applyXP(receiverId, receiverXP, receiverReason, matchId, io)
      : Promise.resolve({ newXP: recUser?.xp ?? 0, newLevel: recUser?.level ?? 1, levelledUp: false, oldLevel: recUser?.level ?? 1, gemsFromLevelUp: 0 }),
  ]);

  // ── Update match counters on User ─────────────────────────────────────────
  const reqCountUpdates = { totalMatches: { increment: 1 } };
  const recCountUpdates = { totalMatches: { increment: 1 } };

  if (requesterWon)   reqCountUpdates.totalWins    = { increment: 1 };
  if (receiverWon)    recCountUpdates.totalWins     = { increment: 1 };
  if (requesterResigned) reqCountUpdates.totalResigns = { increment: 1 };
  if (receiverResigned)  recCountUpdates.totalResigns = { increment: 1 };
  if (outcome === 'DRAW') {
    reqCountUpdates.totalDraws = { increment: 1 };
    recCountUpdates.totalDraws = { increment: 1 };
  }

  await Promise.all([
    prisma.user.update({ where: { id: requesterId }, data: reqCountUpdates }),
    prisma.user.update({ where: { id: receiverId },  data: recCountUpdates }),
  ]);

  // ── Update streaks ────────────────────────────────────────────────────────
  const [reqStreak, recStreak] = await Promise.all([
    updateStreak(requesterId),
    updateStreak(receiverId),
  ]);

  // ── Streak XP bonuses ─────────────────────────────────────────────────────
  if (reqStreak.isFirstSessionToday && reqStreak.newStreak > 0) {
    await applyXP(requesterId, 5, 'DAILY_LOGIN', matchId, io);
  }
  if (recStreak.isFirstSessionToday && recStreak.newStreak > 0) {
    await applyXP(receiverId, 5, 'DAILY_LOGIN', matchId, io);
  }

  // ── Gem milestones ────────────────────────────────────────────────────────
  // Only count WIN and DRAW toward match milestones (not RESIGN)
  const { checkMatchMilestone } = require('./gem.service');
  const reqCompletedMatches = (reqUser?.totalWins ?? 0) + (requesterWon ? 1 : 0) +
    (reqUser?.totalDraws ?? 0) + (outcome === 'DRAW' ? 1 : 0);
  const recCompletedMatches = (recUser?.totalWins ?? 0) + (receiverWon ? 1 : 0) +
    (recUser?.totalDraws ?? 0) + (outcome === 'DRAW' ? 1 : 0);

  const [reqGemsMatch, recGemsMatch] = await Promise.all([
    (!requesterResigned) ? checkMatchMilestone(requesterId, reqCompletedMatches) : Promise.resolve(0),
    (!receiverResigned)  ? checkMatchMilestone(receiverId, recCompletedMatches)  : Promise.resolve(0),
  ]);

  // Streak gem milestones
  const [reqGemsStreak, recGemsStreak] = await Promise.all([
    checkStreakMilestone(requesterId, reqStreak.newStreak),
    checkStreakMilestone(receiverId,  recStreak.newStreak),
  ]);

  // ── Fetch final user state ────────────────────────────────────────────────
  const [reqFinal, recFinal] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { xp: true, gems: true, level: true, streakLength: true } }),
    prisma.user.findUnique({ where: { id: receiverId },  select: { xp: true, gems: true, level: true, streakLength: true } }),
  ]);

  // ── Build result descriptions ─────────────────────────────────────────────
  const describeOutcome = (xpChange, won, resigned) => {
    if (resigned)       return `You resigned — ${xpChange} XP`;
    if (won)            return `You won! +${xpChange} XP`;
    if (xpChange === 0) return 'Draw — no XP change';
    return `+${xpChange} XP`;
  };

  results.requester = {
    xpChange:   requesterXP,
    newXP:      reqFinal?.xp ?? 0,
    newGems:    reqFinal?.gems ?? 0,
    newLevel:   reqFinal?.level ?? 1,
    newStreak:  reqStreak.newStreak,
    levelledUp: reqXPResult.levelledUp,
    gemsEarned: (reqGemsMatch + reqGemsStreak + reqXPResult.gemsFromLevelUp),
    reason:     describeOutcome(requesterXP, requesterWon, requesterResigned),
  };

  results.receiver = {
    xpChange:   receiverXP,
    newXP:      recFinal?.xp ?? 0,
    newGems:    recFinal?.gems ?? 0,
    newLevel:   recFinal?.level ?? 1,
    newStreak:  recStreak.newStreak,
    levelledUp: recXPResult.levelledUp,
    gemsEarned: (recGemsMatch + recGemsStreak + recXPResult.gemsFromLevelUp),
    reason:     describeOutcome(receiverXP, receiverWon, receiverResigned),
  };

  return results;
}

module.exports = { applyXP, updateStreak, getEconomySummary, processSessionEconomy };
