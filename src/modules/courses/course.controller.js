const prisma = require('../../config/database');

// ── Get all courses ────────────────────────────────────────────────────────────
const getAllCourses = async () => {
  return prisma.course.findMany({
    orderBy: { id: 'asc' },
  });
};

// ── Get course by ID ───────────────────────────────────────────────────────────
const getCourseById = async (courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course) throw new Error('Course not found');
  return course;
};

// ── Get all courses a user has ever started ────────────────────────────────────
const getUserCourses = async (userId) => {
  const progressRecords = await prisma.userCourseProgress.findMany({
    where:   { userId },
    include: { course: true },
  });
  return progressRecords.map((p) => p.course);
};

// ── Change user's active course + initialize progress if first time ────────────
const changeUserCourse = async (userId, newCourseId) => {
  // Verify course exists
  await getCourseById(newCourseId);

  // Find the first lesson of the new course (ordered by unit then lesson)
  const firstLesson = await prisma.lesson.findFirst({
    where: { unit: { courseId: newCourseId } },
    orderBy: [
      { unit: { orderIndex: 'asc' } },
      { orderIndex: 'asc' },
    ],
  });

  // Run both updates in a transaction
  await prisma.$transaction([
    // Update user's active course
    prisma.user.update({
      where: { id: userId },
      data:  { currentCourseId: newCourseId },
    }),

    // Upsert course progress (create if first time, leave alone if already exists)
    ...(firstLesson
      ? [
          prisma.userCourseProgress.upsert({
            where:  { userId_courseId: { userId, courseId: newCourseId } },
            create: { userId, courseId: newCourseId, currentLessonId: firstLesson.id },
            update: {}, // don't overwrite existing progress
          }),
        ]
      : []),
  ]);

  return {
    newCourseId,
    currentLessonId: firstLesson?.id ?? null,
  };
};

// ── Get sections for a course ──────────────────────────────────────────────────
const getSectionsByCourse = async (courseId) => {
  await getCourseById(courseId);

  return prisma.section.findMany({
    where:   { courseId },
    orderBy: { orderIndex: 'asc' },
    include: {
      units: {
        orderBy: { orderIndex: 'asc' },
        include: {
          pathIcon: true,
          lessons: {
            orderBy: { orderIndex: 'asc' },
            select:  { id: true, title: true, type: true, lessonType: true, orderIndex: true },
          },
        },
      },
    },
  });
};

// ── Get only section IDs for a course (lightweight) ───────────────────────────
const getSectionIdsByCourse = async (courseId) => {
  await getCourseById(courseId);

  const sections = await prisma.section.findMany({
    where:   { courseId },
    orderBy: { orderIndex: 'asc' },
    select:  { id: true, title: true, orderIndex: true },
  });

  return sections;
};

module.exports = {
  getAllCourses,
  getCourseById,
  getUserCourses,
  changeUserCourse,
  getSectionsByCourse,
  getSectionIdsByCourse,
};