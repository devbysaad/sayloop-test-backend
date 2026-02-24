const { z } = require('zod');

// Inline validate middleware factory
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }
  if (result.data.body) req.body = result.data.body;
  if (result.data.params) req.params = result.data.params;
  if (result.data.query) req.query = result.data.query;
  next();
};

// ─── Profiles schemas ─────────────────────────────────────────────────────────

const searchPartnersSchema = z.object({
  query: z.object({
    topic: z.string().min(2).max(100).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('0'),
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
  validate,
  searchPartnersSchema,
  getProfileStatsSchema,
  getPublicProfileSchema,
  updateBioSchema,
};