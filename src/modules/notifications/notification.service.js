const prisma = require('../../config/database');

// Since we do not have a notifications table in the DB schema yet,
// we simulate it using in-memory triggers and return structured data.
// In production you would add a Notification model to schema.prisma.

// Generate notifications based on user activity
const getNotifications = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { streakLength: true, lastSubmission: true, points: true },
  });
  if (!user) throw new Error('User not found');

  const notifications = [];
  const now           = new Date();
  const lastSub       = user.lastSubmission ? new Date(user.lastSubmission) : null;
  const diffHours     = lastSub ? (now - lastSub) / (1000 * 60 * 60) : null;

  // Streak at risk notification
  if (diffHours !== null && diffHours >= 20 && diffHours < 48) {
    notifications.push({
      id:      1,
      type:    'STREAK_AT_RISK',
      title:   `Don't break your ${user.streakLength}-day streak!`,
      message: 'Practice now to keep your streak alive 🔥',
      read:    false,
      createdAt: new Date(),
    });
  }

  // Streak broken notification
  if (diffHours !== null && diffHours >= 48 && user.streakLength > 0) {
    notifications.push({
      id:      2,
      type:    'STREAK_BROKEN',
      title:   'Your streak was broken 😢',
      message: 'Repair your streak with gems and get back on track!',
      read:    false,
      createdAt: new Date(),
    });
  }

  // Milestone notifications
  if (user.streakLength === 7)  notifications.push({ id: 3, type: 'MILESTONE', title: '7-day streak! 🔥', message: 'One week strong!', read: false, createdAt: new Date() });
  if (user.streakLength === 30) notifications.push({ id: 4, type: 'MILESTONE', title: '30-day streak! 🏆', message: 'One month of learning!', read: false, createdAt: new Date() });

  return notifications;
};

const getUnreadCount = async (userId) => {
  const notifications = await getNotifications(userId);
  return { count: notifications.filter((n) => !n.read).length };
};

module.exports = { getNotifications, getUnreadCount };
