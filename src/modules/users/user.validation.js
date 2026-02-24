const { z } = require('zod');

const syncUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    clerkId: z.string().optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    pfpSource: z.string().url('Invalid URL').optional(),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 chars').max(50).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    pfpSource: z.string().url('Invalid image URL').optional(),
  }),
});

module.exports = { syncUserSchema, updateProfileSchema };
