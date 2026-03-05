const { z } = require('zod');

const searchPartnersSchema = z.object({
  query: z.object({
    topic: z.string().min(2).max(100).optional(),
    page:  z.string().regex(/^\d+$/).transform(Number).default('0'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }),
});

const getProfileStatsSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^\d+$/, 'userId must be a number').transform(Number),
  }),
});

const getPublicProfileSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^\d+$/, 'userId must be a number').transform(Number),
  }),
});

const updateBioSchema = z.object({
  body: z.object({
    bio: z.string().max(300, 'Bio must be 300 characters or fewer'),
  }),
});

module.exports = {
  searchPartnersSchema,
  getProfileStatsSchema,
  getPublicProfileSchema,
  updateBioSchema,
};