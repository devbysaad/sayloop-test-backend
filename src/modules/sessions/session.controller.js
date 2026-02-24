const sessionService = require('./session.service');
const { success, error } = require('../../utils/response');

// GET /api/sessions/history
const getSessionHistory = async (req, res) => {
  try {
    const userId = req.dbUserId;
    const history = await sessionService.getActiveSession(userId);
    return success(res, history, 'Session history fetched');
  } catch (err) {
    return error(res, 'Failed to get session history');
  }
};

// POST /api/sessions/result  — called after debate ends to save XP
const saveSessionResult = async (req, res) => {
  try {
    const { user1Id, user2Id, topic, roomId, winner } = req.body;
    const result = await sessionService.saveSessionResult({ user1Id, user2Id, topic, roomId, winner });
    return success(res, result, 'Session result saved');
  } catch (err) {
    console.error('Error in saveSessionResult:', err);
    return error(res, 'Failed to save session result', 400);
  }
};

module.exports = { getSessionHistory, saveSessionResult };