const { z } = require('zod');

// POST /change
const changeCourseSchema = z.object({
  newCourseId: z
    .number({ required_error: 'newCourseId is required', invalid_type_error: 'newCourseId must be a number' })
    .int('newCourseId must be an integer')
    .positive('newCourseId must be a positive number'),
});

module.exports = { changeCourseSchema };