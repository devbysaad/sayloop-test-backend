const prisma = require('../../config/database');

// Get all exercises for a lesson (with options, correct answers hidden)
const getExercisesByLesson = async (lessonId) => {
  const exercises = await prisma.exercise.findMany({
    where:   { lessonId },
    orderBy: { orderIndex: 'asc' },
    include: {
      exerciseOptions: {
        select: {
          id: true, content: true, imageUrl: true, answerOrder: true,
          // DO NOT expose isCorrect here — frontend should not know the answer
        },
        orderBy: { answerOrder: 'asc' },
      },
    },
  });
  if (!exercises.length) throw new Error('No exercises found for this lesson');
  return exercises;
};

// Submit an answer for an exercise
const submitAnswer = async (userId, exerciseId, optionId) => {
  // Verify option belongs to exercise
  const option = await prisma.exerciseOption.findFirst({
    where: { id: optionId, exerciseId },
  });
  if (!option) throw new Error('Invalid option for this exercise');

  const isCorrect = option.isCorrect;
  const score     = isCorrect ? 10 : 0;

  // Record the attempt
  const attempt = await prisma.exerciseAttempt.create({
    data: {
      userId,
      exerciseId,
      optionId,
      score,
      isChecked: true,
    },
  });

  return {
    attemptId:  attempt.id,
    isCorrect,
    score,
    correctOption: isCorrect ? null : await prisma.exerciseOption.findFirst({
      where:  { exerciseId, isCorrect: true },
      select: { id: true, content: true },
    }),
  };
};

// Get result of an exercise attempt
const getExerciseResult = async (exerciseId, userId) => {
  const attempt = await prisma.exerciseAttempt.findFirst({
    where:   { exerciseId, userId },
    orderBy: { submittedAt: 'desc' },
    include: { option: true },
  });
  if (!attempt) throw new Error('No attempt found');
  return attempt;
};

module.exports = { getExercisesByLesson, submitAnswer, getExerciseResult };
