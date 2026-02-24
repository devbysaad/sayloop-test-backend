const lessonService      = require('./lesson.service');
const { success, error } = require('../../utils/response');

// GET /api/lessons/:sectionId/lessons
const getLessonsBySection = async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId);
    const lessons   = await lessonService.getLessonsBySection(sectionId);
    return success(res, lessons, 'Lessons fetched');
  } catch (err) {
    return error(res, 'Failed to get lessons');
  }
};

// GET /api/lessons/lesson/:lessonId
const getLessonById = async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    const lesson   = await lessonService.getLessonById(lessonId);
    return success(res, lesson, 'Lesson fetched');
  } catch (err) {
    return error(res, err.message || 'Lesson not found', 404);
  }
};

// POST /api/lessons/lesson/:lessonId/complete
const completeLesson = async (req, res) => {
  try {
    const userId   = req.user.dbId;
    const lessonId = parseInt(req.params.lessonId);
    const { score } = req.body;
    const result   = await lessonService.completeLesson(userId, lessonId, score);
    return success(res, result, 'Lesson completed!');
  } catch (err) {
    console.error('Error in completeLesson:', err);
    return error(res, err.message || 'Failed to complete lesson', 400);
  }
};

module.exports = { getLessonsBySection, getLessonById, completeLesson };
