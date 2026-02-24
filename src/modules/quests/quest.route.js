const express        = require('express');
const router         = express.Router();
const questController = require('./quest.controller');
const { protect }    = require('../../middleware/auth.middleware');
const { validate }   = require('../../middleware/validate.middleware');
const { completeQuestSchema } = require('./quest.validation');
const paths          = require('../../config/constants');

// All quest routes require authentication
router.use(protect);

router.get(paths.GET_QUESTS_BY_USER,   questController.getQuestsByUser);
router.get(paths.GET_MONTHLY_CHALLENGE, questController.getMonthlyChallenge);
router.post(paths.COMPLETE_QUEST,       validate(completeQuestSchema), questController.completeQuest);
router.post(paths.CLAIM_QUEST_REWARD,   questController.claimQuestReward);

module.exports = router;