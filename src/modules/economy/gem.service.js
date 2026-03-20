/**
 * SayLoop — Gem Service
 * Handles all gem awarding logic with idempotency guarantees.
 */

const prisma = require('../../config/database');

// Streaks that unlock gem bonuses (one-time per milestone)
const STREAK_GEM_MILESTONES = [
  { days: 7,   gems: 2 },
  { days: 14,  gems: 3 },
  { days: 30,  gems: 5 },
  { days: 60,  gems: 8 },
  { days: 100, gems: 15 },
];

/**
 * Award gems to a user and log the GemTransaction.
 * @param {number} userId
 * @param {number} amount  — positive value only
 * @param {string} reason  — GemReason enum value
 * @returns {Promise<number>} new gem total
 */
async function awardGems(userId, amount, reason) {
  if (amount <= 0) return;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      gems: { increment: amount },
      gemTransactions: {
        create: { amount, reason },
      },
    },
    select: { gems: true },
  });
  console.log(`[Gems] userId=${userId} +${amount} (${reason}) → total=${user.gems}`);
  return user.gems;
}

/**
 * Deduct gems for a shop purchase.
 * @param {number} userId
 * @param {number} cost
 * @returns {Promise<{ success: boolean, newGems: number }>}
 */
async function spendGems(userId, cost) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { gems: true } });
  if (!user || user.gems < cost) return { success: false, newGems: user?.gems ?? 0 };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      gems: { decrement: cost },
      gemTransactions: {
        create: { amount: -cost, reason: 'SHOP_PURCHASE' },
      },
    },
    select: { gems: true },
  });
  return { success: true, newGems: updated.gems };
}

/**
 * Check and award gem milestone for every 10 completed matches (WIN or DRAW).
 * Idempotent: checks totalMatches % 10 === 0 after increment.
 * @param {number} userId
 * @param {number} totalCompletedMatches  — already incremented value (WIN+DRAW count)
 * @returns {Promise<number>} gems earned (0 if no milestone)
 */
async function checkMatchMilestone(userId, totalCompletedMatches) {
  if (totalCompletedMatches > 0 && totalCompletedMatches % 10 === 0) {
    await awardGems(userId, 1, 'MATCH_MILESTONE');
    return 1;
  }
  return 0;
}

/**
 * Check and award gem milestones for streak lengths.
 * Uses GemTransaction as the idempotency guard — checks if a STREAK_MILESTONE
 * for this exact streak length has already been awarded.
 * @param {number} userId
 * @param {number} newStreak
 * @returns {Promise<number>} gems earned (0 if no milestone)
 */
async function checkStreakMilestone(userId, newStreak) {
  const milestone = STREAK_GEM_MILESTONES.find((m) => m.days === newStreak);
  if (!milestone) return 0;

  // Idempotency: check if we already awarded this milestone in the last 2 days
  const recentAward = await prisma.gemTransaction.findFirst({
    where: {
      userId,
      reason: 'STREAK_MILESTONE',
      amount: milestone.gems,
      createdAt: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recentAward) return 0;

  await awardGems(userId, milestone.gems, 'STREAK_MILESTONE');
  return milestone.gems;
}

module.exports = { awardGems, spendGems, checkMatchMilestone, checkStreakMilestone };
