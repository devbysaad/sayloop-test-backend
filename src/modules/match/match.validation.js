const { z } = require('zod');

// ─── Match schemas ────────────────────────────────────────────────────────────

const findMatchSchema = z.object({
  body: z.object({
    userId:    z.number({ required_error: 'userId is required' }).int().positive(),
    partnerId: z.number({ required_error: 'partnerId is required' }).int().positive(),
    topic:     z.string({ required_error: 'topic is required' }).min(2).max(100),
  }),
});

const matchIdParamSchema = z.object({
  params: z.object({
    matchId: z
      .string()
      .regex(/^\d+$/, 'matchId must be a number')
      .transform(Number),
  }),
});

const getActiveMatchesSchema = z.object({
  query: z.object({
    userId: z
      .string({ required_error: 'userId query param is required' })
      .regex(/^\d+$/, 'userId must be a number')
      .transform(Number),
  }),
});

const getMatchHistorySchema = z.object({
  query: z.object({
    userId: z
      .string({ required_error: 'userId query param is required' })
      .regex(/^\d+$/)
      .transform(Number),
    page:  z.string().regex(/^\d+$/).transform(Number).default('0'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  }),
});

// ─── Validation middleware factory ────────────────────────────────────────────
/**
 * Creates an Express middleware that validates req against a Zod schema.
 * Schema should have optional `body`, `params`, `query` keys.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body:   req.body,
    params: req.params,
    query:  req.query,
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  // Merge coerced/transformed values back
  if (result.data.body)   req.body   = result.data.body;
  if (result.data.params) req.params = result.data.params;
  if (result.data.query)  req.query  = result.data.query;

  next();
};

module.exports = {
  validate,
  findMatchSchema,
  matchIdParamSchema,
  getActiveMatchesSchema,
  getMatchHistorySchema,
};