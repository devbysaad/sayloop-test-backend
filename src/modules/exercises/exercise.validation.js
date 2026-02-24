const { z } = require('zod');

const submitAnswerSchema = z.object({
  optionId: z
    .number({ required_error: 'optionId is required', invalid_type_error: 'optionId must be a number' })
    .int()
    .positive('optionId must be positive'),
});

module.exports = { submitAnswerSchema };
