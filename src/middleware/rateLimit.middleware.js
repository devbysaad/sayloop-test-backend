const rateLimit = require('express-rate-limit');

// ── Global fallback — all other routes ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// ── Browse users — relaxed for 4-second polling ───────────────────────────────
// 60 req/min = 1/s. With a 4s poll interval this gives 15x headroom per user.
const browseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many browse requests, slow down.' },
});

// ── Auth / sync — strict to prevent abuse ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please wait.' },
});

module.exports = { globalLimiter, browseLimiter, authLimiter };

