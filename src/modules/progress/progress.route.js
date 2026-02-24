const express              = require('express');
const router               = express.Router();
const progressController   = require('./progress.controller');
const { protect }          = require('../../middleware/auth.middleware');
const paths                = require('../../config/constants');

router.use(protect);

router.get(paths.GET_USER_PROGRESS, progressController.getUserProgress);
router.get(paths.GET_LEVEL_PROGRESS, progressController.getLevelProgress);
router.get(paths.GET_XP_HISTORY,     progressController.getXPHistory);

module.exports = router;
