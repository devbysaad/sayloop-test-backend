const questService   = require('./quest.service');
const { success, error } = require('../../utils/response');

// GET /api/quests/get
const getQuestsByUser = async (req, res) => {
  try {
    const userId = req.user.dbId; // set by auth middleware after DB lookup
    const quests = await questService.getQuestsByUser(userId);
    return success(res, quests, 'Quests fetched successfully');
  } catch (err) {
    console.error('Error in getQuestsByUser:', err);
    return error(res, 'Failed to get quests');
  }
};

// GET /api/quests/monthly
const getMonthlyChallenge = async (req, res) => {
  try {
    const userId    = req.user.dbId;
    const challenge = await questService.getMonthlyChallenge(userId);
    return success(res, challenge, 'Monthly challenge fetched successfully');
  } catch (err) {
    console.error('Error in getMonthlyChallenge:', err);
    return error(res, 'Failed to get monthly challenge');
  }
};

// POST /api/quests/:questId/complete
const completeQuest = async (req, res) => {
  try {
    const userId     = req.user.dbId;
    const questDefId = parseInt(req.params.questId);
    const { incrementBy = 1 } = req.body;

    const result = await questService.completeQuest(userId, questDefId, incrementBy);
    return success(res, result, result.justCompleted ? 'Quest completed!' : 'Progress updated');
  } catch (err) {
    console.error('Error in completeQuest:', err);
    return error(res, err.message || 'Failed to complete quest');
  }
};

// POST /api/quests/:questId/claim
const claimQuestReward = async (req, res) => {
  try {
    const userId     = req.user.dbId;
    const questDefId = parseInt(req.params.questId);

    const result = await questService.claimQuestReward(userId, questDefId);
    return success(res, result, 'Reward claimed successfully');
  } catch (err) {
    console.error('Error in claimQuestReward:', err);
    return error(res, err.message || 'Failed to claim reward', 400);
  }
};

module.exports = {
  getQuestsByUser,
  getMonthlyChallenge,
  completeQuest,
  claimQuestReward,
};