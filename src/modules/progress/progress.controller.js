const progressService    = require('./progress.service');
const { success, error } = require('../../utils/response');

// GET /api/progress/:userId
const getUserProgress = async (req, res) => {
  try {
    const userId   = parseInt(req.params.userId);
    const progress = await progressService.getUserProgress(userId);
    return success(res, progress, 'Progress fetched');
  } catch (err) {
    return error(res, 'Failed to get progress');
  }
};

// GET /api/progress/:userId/level  (course-specific)
const getLevelProgress = async (req, res) => {
  try {
    const userId   = parseInt(req.params.userId);
    const { courseId } = req.query;
    if (!courseId) return error(res, 'courseId query param required', 400);
    const progress = await progressService.getCourseProgress(userId, parseInt(courseId));
    return success(res, progress, 'Course progress fetched');
  } catch (err) {
    return error(res, err.message || 'Failed to get course progress', 404);
  }
};

// GET /api/progress/:userId/xp-history
const getXPHistory = async (req, res) => {
  try {
    const userId  = parseInt(req.params.userId);
    const history = await progressService.getXPHistory(userId);
    return success(res, history, 'XP history fetched');
  } catch (err) {
    return error(res, 'Failed to get XP history');
  }
};

module.exports = { getUserProgress, getLevelProgress, getXPHistory };
