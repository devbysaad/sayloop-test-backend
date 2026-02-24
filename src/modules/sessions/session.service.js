const prisma = require('../../config/database');

// Get active session for a user
const getActiveSession = async (userId) => {
  // Sessions are tracked in-memory via Socket.io
  // This REST endpoint returns session history from DB
  const completions = await prisma.lessonCompletion.findMany({
    where:   { userId },
    orderBy: { completedAt: 'desc' },
    take:    5,
    include: { lesson: { select: { title: true } } },
  });
  return completions;
};

// Save debate session result to DB after session ends
const saveSessionResult = async ({ user1Id, user2Id, topic, roomId, winner }) => {
  // You will add a Debate or Session model to schema.prisma later
  // For now we award XP to both participants
  const XP_WIN        = 30;
  const XP_PARTICIPATE = 10;

  const updates = [];

  if (winner) {
    const loserId = winner === user1Id ? user2Id : user1Id;
    updates.push(
      prisma.user.update({ where: { id: winner }, data: { points: { increment: XP_WIN } } }),
      prisma.user.update({ where: { id: loserId }, data: { points: { increment: XP_PARTICIPATE } } })
    );
  } else {
    // Draw — both get participation XP
    updates.push(
      prisma.user.update({ where: { id: user1Id }, data: { points: { increment: XP_PARTICIPATE } } }),
      prisma.user.update({ where: { id: user2Id }, data: { points: { increment: XP_PARTICIPATE } } })
    );
  }

  await prisma.$transaction(updates);
  return { success: true, message: 'Session result saved' };
};

module.exports = { getActiveSession, saveSessionResult };