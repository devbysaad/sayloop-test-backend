const { z } = require('zod');

// POST /:questId/complete
const completeQuestSchema = z.object({
  incrementBy: z
    .number({ invalid_type_error: 'incrementBy must be a number' })
    .int('incrementBy must be an integer')
    .min(1, 'incrementBy must be at least 1')
    .max(100, 'incrementBy cannot exceed 100')
    .optional()
    .default(1),
});

module.exports = { completeQuestSchema };