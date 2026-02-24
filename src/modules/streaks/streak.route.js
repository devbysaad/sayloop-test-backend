const express           = require('express');
const router            = express.Router();
const streakController  = require('./streak.controller');
const { protect }       = require('../../middleware/auth.middleware');
const paths             = require('../../config/constants');

router.use(protect);

router.get(paths.GET_STREAK,      streakController.getStreak);
router.post(paths.FREEZE_STREAK,  streakController.freezeStreak);
router.post(paths.REPAIR_STREAK,  streakController.repairStreak);

module.exports = router;
