const express              = require('express');
const router               = express.Router();
const exerciseController   = require('./exercise.controller');
const { protect }          = require('../../middleware/auth.middleware');
const { validate }         = require('../../middleware/validate.middleware');
const { submitAnswerSchema } = require('./exercise.validation');
const paths                = require('../../config/constants');

router.use(protect);

router.get(paths.GET_EXERCISES_BY_LESSON, exerciseController.getExercisesByLesson);
router.post(paths.SUBMIT_ANSWER,           validate(submitAnswerSchema), exerciseController.submitAnswer);
router.get(paths.GET_EXERCISE_RESULT,      exerciseController.getExerciseResult);

module.exports = router;
