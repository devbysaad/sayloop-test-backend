const prisma       = require('../../config/database');
const userService  = require('../users/user.service');
const questService = require('../quests/quest.service');
const { XP_VALUES, calculateLessonXP } = require('../../utils/xp');

// Get all lessons for a section (via units)
const getLessonsBySection = async (sectionId) => {
  const units = await prisma.unit.findMany({
    where:   { sectionId },
    orderBy: { orderIndex: 'asc' },
    include: {
      lessons: {
        orderBy: { orderIndex: 'asc' },
        select:  { id: true, title: true, type: true, lessonType: true, orderIndex: true },
      },
      pathIcon: true,
    },
  });
  return units;
};

// Get a single lesson with its exercises
const getLessonById = async (lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where:   { id: lessonId },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: { exerciseOptions: true },
      },
    },
  });
  if (!lesson) throw new Error('Lesson not found');
  return lesson;
};

// Get user progress for a specific lesson
const getUserLessonProgress = async (userId, lessonId) => {
  return prisma.lessonCompletion.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
};

// Complete a lesson — awards XP, updates streak, updates quest progress, updates course progress
const completeLesson = async (userId, lessonId, score) => {
  const lesson = await prisma.lesson.findUnique({
    where:   { id: lessonId },
    include: { unit: { select: { courseId: true } } },
  });
  if (!lesson) throw new Error('Lesson not found');

  const courseId   = lesson.unit.courseId;
  const xpEarned   = calculateLessonXP(score);
  const isPerfect  = score === 100;

  // Find next lesson for course progress update
  const nextLesson = await prisma.lesson.findFirst({
    where: {
      unit:       { courseId },
      orderIndex: { gt: lesson.orderIndex },
    },
    orderBy: [
      { unit: { orderIndex: 'asc' } },
      { orderIndex: 'asc' },
    ],
  });

  // Run everything in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Upsert lesson completion
    await tx.lessonCompletion.upsert({
      where:  { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, courseId, score },
      update: { score: Math.max(score, 0), completedAt: new Date() },
    });

    // 2. Award XP to user
    await tx.user.update({
      where: { id: userId },
      data:  { points: { increment: xpEarned } },
    });

    // 3. Advance course progress to next lesson
    if (nextLesson) {
      await tx.userCourseProgress.upsert({
        where:  { userId_courseId: { userId, courseId } },
        create: { userId, courseId, currentLessonId: nextLesson.id },
        update: { currentLessonId: nextLesson.id },
      });
    } else {
      // Mark course complete
      await tx.userCourseProgress.update({
        where: { userId_courseId: { userId, courseId } },
        data:  { isComplete: true },
      });
    }
  });

  // 4. Update streak (outside transaction — non-critical)
  await userService.updateStreak(userId);

  // 5. Auto-update quest progress (EARN_XP + COMPLETE_LESSON + PERFECT_LESSON)
  const questDefs = await prisma.questDefinition.findMany({ where: { active: true } });
  for (const qd of questDefs) {
    if (qd.code === 'EARN_XP')          await questService.completeQuest(userId, qd.id, xpEarned).catch(() => {});
    if (qd.code === 'COMPLETE_LESSON')  await questService.completeQuest(userId, qd.id, 1).catch(() => {});
    if (qd.code === 'PERFECT_LESSON' && isPerfect) await questService.completeQuest(userId, qd.id, 1).catch(() => {});
  }

  return {
    lessonId,
    score,
    xpEarned,
    isPerfect,
    nextLessonId: nextLesson?.id ?? null,
    courseComplete: !nextLesson,
  };
};

module.exports = { getLessonsBySection, getLessonById, getUserLessonProgress, completeLesson };
