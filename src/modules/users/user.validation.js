const { z } = require('zod');

const syncUserSchema = z.object({
  body: z.object({
    email:     z.string().email('Invalid email'),
    firstName: z.string().max(100).optional(),
    lastName:  z.string().max(100).optional(),
    pfpSource: z.string().url('Invalid URL').optional(),
    // clerkId is NEVER accepted from body — only from verified JWT
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    username:         z.string().min(3).max(50).optional(),
    firstName:        z.string().min(1).max(100).optional(),
    lastName:         z.string().min(1).max(100).optional(),
    pfpSource:        z.string().url('Invalid image URL').optional(),
    // Onboarding fields
    learningLanguage: z.string().min(2).max(10).optional(),
    interests:        z.array(z.string()).max(20).optional(),
  }),
});

module.exports = { syncUserSchema, updateProfileSchema };