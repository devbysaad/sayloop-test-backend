const prisma = require('../../config/database');

const MAX_HEARTS     = 5;
const HEART_REFILL_COST = 10; // gems cost to refill
const REFILL_HOURS   = 4;     // hours to wait for free refill

// Get heart status for user (stored as part of their profile via points proxy)
// Hearts are tracked via a simple in-memory model:
// We store hearts count as a separate concern in user record.
// For now we use a convention: hearts = 5 minus today's wrong exercise attempts
const getHeartStatus = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count wrong attempts today
  const wrongToday = await prisma.exerciseAttempt.count({
    where: {
      userId,
      isChecked:   true,
      score:       0,
      submittedAt: { gte: today },
    },
  });

  const heartsRemaining = Math.max(0, MAX_HEARTS - wrongToday);
  const nextRefill      = heartsRemaining < MAX_HEARTS
    ? new Date(today.getTime() + REFILL_HOURS * 60 * 60 * 1000)
    : null;

  return {
    hearts:        heartsRemaining,
    maxHearts:     MAX_HEARTS,
    nextFreeRefill: nextRefill,
    isFull:        heartsRemaining === MAX_HEARTS,
  };
};

// Use a heart (called when user gets a wrong answer)
const useHeart = async (userId) => {
  const status = await getHeartStatus(userId);
  if (status.hearts === 0) throw new Error('No hearts remaining. Wait for refill or use gems.');
  return { heartsRemaining: status.hearts - 1 };
};

// Refill hearts using gems
const refillHearts = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { points: true },
  });
  if (!user) throw new Error('User not found');
  if (user.points < HEART_REFILL_COST) throw new Error('Not enough gems to refill hearts');

  await prisma.user.update({
    where: { id: userId },
    data:  { points: { decrement: HEART_REFILL_COST } },
  });

  return { hearts: MAX_HEARTS, gemsCost: HEART_REFILL_COST };
};

module.exports = { getHeartStatus, useHeart, refillHearts, MAX_HEARTS };
