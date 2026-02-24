const prisma = require('../../config/database');

// Get full user progress across all courses
const getUserProgress = async (userId) => {
  const progressRecords = await prisma.userCourseProgress.findMany({
    where:   { userId },
    include: {
      course:        { select: { id: true, title: true, imageSrc: true } },
      currentLesson: { select: { id: true, title: true, orderIndex: true } },
    },
  });

  const completedLessons = await prisma.lessonCompletion.count({ where: { userId } });
  const totalXP          = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });

  return {
    totalXP:          totalXP?.points ?? 0,
    completedLessons,
    courses:          progressRecords,
  };
};

// Get progress for a specific course
const getCourseProgress = async (userId, courseId) => {
  const progress = await prisma.userCourseProgress.findUnique({
    where:   { userId_courseId: { userId, courseId } },
    include: {
      course:        { select: { id: true, title: true } },
      currentLesson: { select: { id: true, title: true, orderIndex: true } },
    },
  });
  if (!progress) throw new Error('No progress found for this course');

  // Count completed lessons in this course
  const completedInCourse = await prisma.lessonCompletion.count({
    where: { userId, courseId },
  });

  // Count total lessons in this course
  const totalLessons = await prisma.lesson.count({
    where: { unit: { courseId } },
  });

  return {
    ...progress,
    completedLessons: completedInCourse,
    totalLessons,
    percentComplete:  totalLessons > 0 ? Math.round((completedInCourse / totalLessons) * 100) : 0,
  };
};

// Get XP history (last 30 lesson completions)
const getXPHistory = async (userId) => {
  const completions = await prisma.lessonCompletion.findMany({
    where:   { userId },
    orderBy: { completedAt: 'desc' },
    take:    30,
    include: { lesson: { select: { title: true } } },
  });

  return completions.map((c) => ({
    lessonId:    c.lessonId,
    lessonTitle: c.lesson.title,
    score:       c.score,
    completedAt: c.completedAt,
  }));
};

module.exports = { getUserProgress, getCourseProgress, getXPHistory };
