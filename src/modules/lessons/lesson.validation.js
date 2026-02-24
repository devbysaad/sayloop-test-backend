const { z } = require('zod');

const completeLessonSchema = z.object({
  score: z
    .number({ required_error: 'score is required', invalid_type_error: 'score must be a number' })
    .int()
    .min(0,   'Score cannot be negative')
    .max(100, 'Score cannot exceed 100'),
});

module.exports = { completeLessonSchema };
