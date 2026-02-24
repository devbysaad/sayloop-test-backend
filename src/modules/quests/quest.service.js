const prisma = require('../../config/database');

// ── Get all active daily quests for a user (with their progress today) ────────
const getQuestsByUser = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active quest definitions
  const questDefs = await prisma.questDefinition.findMany({
    where: { active: true },
    include: {
      userDailyQuests: {
        where: {
          userId,
          date: today,
        },
      },
    },
  });

  // Shape response to match original format
  return questDefs.map((qd) => {
    const userQuest = qd.userDailyQuests[0] ?? null;
    return {
      questId:      qd.id,
      code:         qd.code,
      target:       qd.target,
      rewardPoints: qd.rewardPoints,
      progress:     userQuest?.progress     ?? 0,
      completedAt:  userQuest?.completedAt  ?? null,
      rewardClaimed:userQuest?.rewardClaimed ?? false,
    };
  });
};

// ── Get all active monthly challenges for a user (with their progress) ─────────
const getMonthlyChallenge = async (userId) => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const challengeDefs = await prisma.monthlyChallengeDefinition.findMany({
    where: { active: true },
    include: {
      userMonthlyChallenges: {
        where: { userId, year, month },
      },
    },
  });

  return challengeDefs.map((mcd) => {
    const userChallenge = mcd.userMonthlyChallenges[0] ?? null;
    return {
      challengeId:  mcd.id,
      code:         mcd.code,
      target:       mcd.target,
      rewardPoints: mcd.rewardPoints,
      progress:     userChallenge?.progress      ?? 0,
      completedAt:  userChallenge?.completedAt   ?? null,
      rewardClaimed:userChallenge?.rewardClaimed  ?? false,
    };
  });
};

// ── Complete a quest (mark progress, set completedAt if target reached) ────────
const completeQuest = async (userId, questDefId, incrementBy = 1) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const questDef = await prisma.questDefinition.findUnique({
    where: { id: questDefId },
  });
  if (!questDef) throw new Error('Quest not found');

  // Upsert user daily quest progress
  const existing = await prisma.userDailyQuest.findUnique({
    where: { userId_questDefId_date: { userId, questDefId, date: today } },
  });

  const newProgress = Math.min((existing?.progress ?? 0) + incrementBy, questDef.target);
  const isCompleted = newProgress >= questDef.target;

  const userQuest = await prisma.userDailyQuest.upsert({
    where: { userId_questDefId_date: { userId, questDefId, date: today } },
    create: {
      userId,
      questDefId,
      date:        today,
      progress:    newProgress,
      completedAt: isCompleted ? new Date() : null,
    },
    update: {
      progress:    newProgress,
      completedAt: isCompleted && !existing?.completedAt ? new Date() : existing?.completedAt,
    },
  });

  return {
    questId:      questDef.id,
    code:         questDef.code,
    target:       questDef.target,
    progress:     userQuest.progress,
    completedAt:  userQuest.completedAt,
    rewardClaimed:userQuest.rewardClaimed,
    justCompleted: isCompleted && !existing?.completedAt,
  };
};

// ── Claim quest reward (award XP to user) ─────────────────────────────────────
const claimQuestReward = async (userId, questDefId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userQuest = await prisma.userDailyQuest.findUnique({
    where: { userId_questDefId_date: { userId, questDefId, date: today } },
    include: { questDef: true },
  });

  if (!userQuest)            throw new Error('Quest not found for today');
  if (!userQuest.completedAt) throw new Error('Quest not completed yet');
  if (userQuest.rewardClaimed) throw new Error('Reward already claimed');

  // Mark reward claimed + award XP to user in a transaction
  const [updatedQuest] = await prisma.$transaction([
    prisma.userDailyQuest.update({
      where: { userId_questDefId_date: { userId, questDefId, date: today } },
      data:  { rewardClaimed: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { points: { increment: userQuest.questDef.rewardPoints } },
    }),
  ]);

  return {
    rewardPoints: userQuest.questDef.rewardPoints,
    rewardClaimed: updatedQuest.rewardClaimed,
  };
};

module.exports = {
  getQuestsByUser,
  getMonthlyChallenge,
  completeQuest,
  claimQuestReward,
};