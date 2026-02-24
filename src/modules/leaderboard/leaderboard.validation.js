const { z } = require('zod');

const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val) : 0))
    .refine((val) => !isNaN(val) && val >= 0, { message: 'page must be 0 or greater' }),

  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

module.exports = { paginationSchema };