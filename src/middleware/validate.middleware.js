/**
 * validate.middleware.js
 * Generic Zod validation middleware.
 * session.route.js imports this — it must exist as a standalone file.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  if (result.data.body) req.body = result.data.body;
  if (result.data.params) req.params = result.data.params;
  if (result.data.query) req.query = result.data.query;

  next();
};

module.exports = { validate };