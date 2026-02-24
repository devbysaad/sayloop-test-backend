const express          = require('express');
const router           = express.Router();
const heartController  = require('./heart.controller');
const { protect }      = require('../../middleware/auth.middleware');
const paths            = require('../../config/constants');

router.use(protect);

router.get(paths.GET_HEART_STATUS, heartController.getHeartStatus);
router.post(paths.USE_HEART,       heartController.useHeart);
router.post(paths.REFILL_HEARTS,   heartController.refillHearts);

module.exports = router;
