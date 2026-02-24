const express            = require('express');
const router             = express.Router();
const lessonController   = require('./lesson.controller');
const { protect }        = require('../../middleware/auth.middleware');
const { validate }       = require('../../middleware/validate.middleware');
const { completeLessonSchema } = require('./lesson.validation');
const paths              = require('../../config/constants');

router.use(protect);

router.get(paths.GET_LESSONS_BY_SECTION, lessonController.getLessonsBySection);
router.get(paths.GET_LESSON_BY_ID,       lessonController.getLessonById);
router.post(paths.COMPLETE_LESSON,        validate(completeLessonSchema), lessonController.completeLesson);

module.exports = router;
