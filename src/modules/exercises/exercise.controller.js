const exerciseService    = require('./exercise.service');
const { success, error } = require('../../utils/response');

// GET /api/exercises/:lessonId/exercises
const getExercisesByLesson = async (req, res) => {
  try {
    const lessonId  = parseInt(req.params.lessonId);
    const exercises = await exerciseService.getExercisesByLesson(lessonId);
    return success(res, exercises, 'Exercises fetched');
  } catch (err) {
    return error(res, err.message || 'Failed to get exercises', 404);
  }
};

// POST /api/exercises/exercise/:exerciseId/submit
const submitAnswer = async (req, res) => {
  try {
    const userId     = req.user.dbId;
    const exerciseId = parseInt(req.params.exerciseId);
    const { optionId } = req.body;
    const result     = await exerciseService.submitAnswer(userId, exerciseId, optionId);
    return success(res, result, result.isCorrect ? 'Correct!' : 'Incorrect');
  } catch (err) {
    console.error('Error in submitAnswer:', err);
    return error(res, err.message || 'Failed to submit answer', 400);
  }
};

// GET /api/exercises/exercise/:exerciseId/result
const getExerciseResult = async (req, res) => {
  try {
    const userId     = req.user.dbId;
    const exerciseId = parseInt(req.params.exerciseId);
    const result     = await exerciseService.getExerciseResult(exerciseId, userId);
    return success(res, result, 'Result fetched');
  } catch (err) {
    return error(res, err.message || 'No result found', 404);
  }
};

module.exports = { getExercisesByLesson, submitAnswer, getExerciseResult };
