const express           = require('express');
const router            = express.Router();
const courseController  = require('./course.controller');
const { protect }       = require('../../middleware/auth.middleware');
const { validate }      = require('../../middleware/validate.middleware');
const { changeCourseSchema } = require('./course.validation');
const paths             = require('../../config/constants');

// Public routes (no auth needed to browse courses)
router.get(paths.GET_ALL_COURSES, courseController.getAllCourses);

// Protected routes
router.use(protect);

router.get(paths.GET_USER_COURSE,          courseController.getUserCourses);
router.post(paths.CHANGE_COURSE,           validate(changeCourseSchema), courseController.changeUserCourse);
router.get(paths.GET_SECTIONS_BY_COURSE,   courseController.getSectionsByCourse);
router.get(paths.GET_SECTION_IDS_BY_COURSE,courseController.getSectionIdsByCourse);

module.exports = router;