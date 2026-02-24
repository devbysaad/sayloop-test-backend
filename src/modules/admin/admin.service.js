const prisma = require('../../config/database');

// Get all users (paginated)
const getAllUsers = async (page = 0, limit = 20) => {
  const skip = page * limit;
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, clerkId: true, username: true, email: true, firstName: true, lastName: true, points: true, streakLength: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);
  return { total, page, limit, users };
};

// Get system stats
const getSystemStats = async () => {
  const [totalUsers, totalLessons, totalCourses, totalCompletions] = await prisma.$transaction([
    prisma.user.count(),
    prisma.lesson.count(),
    prisma.course.count(),
    prisma.lessonCompletion.count(),
  ]);

  const topUser = await prisma.user.findFirst({
    orderBy: { points: 'desc' },
    select:  { username: true, points: true },
  });

  return { totalUsers, totalLessons, totalCourses, totalCompletions, topUser };
};

// Reset a user's points (admin action)
const resetUserPoints = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data:  { points: 0, streakLength: 0 },
  });
};

module.exports = { getAllUsers, getSystemStats, resetUserPoints };
