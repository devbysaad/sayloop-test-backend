const express            = require('express');
const router             = express.Router();
const sessionController  = require('./session.controller');
const { protect }        = require('../../middleware/auth.middleware');
const { validate }       = require('../../middleware/validate.middleware');
const { saveResultSchema } = require('./session.validation');

router.use(protect);

router.get('/history',                                      sessionController.getSessionHistory);
router.post('/result', validate(saveResultSchema),          sessionController.saveSessionResult);

module.exports = router;