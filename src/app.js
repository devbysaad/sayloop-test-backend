const express = require('express');
const cors = require('cors');

const { globalLimiter } = require('./middleware/rateLimit.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { logger } = require('./middleware/logger.middleware');
const paths = require('./config/constants');

// ── Route imports ─────────────────────────────────────────────────────────────
const userRoute = require('./modules/users/user.route');
const matchRoute = require('./modules/match/match.route');
const sessionRoute = require('./modules/sessions/session.route');
const leaderboardRoute = require('./modules/leaderboard/leaderboard.route');
const levelRoute = require('./modules/levels/level.route');
const heartRoute = require('./modules/hearts/heart.route');
const notificationRoute = require('./modules/notifications/notification.route');
const profileRoute = require('./modules/profiles/profile.route');  // ← fixed: was profile.route

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(logger);
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sayloop-test.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(globalLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'Sayloop API is running', status: 'healthy' });
});

// ── Auth diagnostic (temporary — remove after debugging) ─────────────────────
app.get('/api/debug/auth-check', (_req, res) => {
  const sk = process.env.CLERK_SECRET_KEY;
  const dbUrl = process.env.DATABASE_URL;
  res.json({
    clerkSecretKey: {
      isSet: !!sk,
      prefix: sk ? sk.substring(0, 12) + '...' : null,
      length: sk ? sk.length : 0,
      startsWithSk: sk ? sk.startsWith('sk_') : false,
    },
    databaseUrl: {
      isSet: !!dbUrl,
      host: dbUrl ? dbUrl.split('@')[1]?.split('/')[0] ?? '(parse error)' : null,
    },
    nodeEnv: process.env.NODE_ENV || '(not set)',
  });
});

// ── Mount routes ──────────────────────────────────────────────────────────────
app.use(paths.USERS, userRoute);
app.use(paths.MATCHES, matchRoute);
app.use(paths.SESSIONS, sessionRoute);
app.use(paths.LEADERBOARD, leaderboardRoute);
app.use(paths.LEVELS, levelRoute);
app.use(paths.HEARTS, heartRoute);
app.use(paths.NOTIFICATIONS, notificationRoute);
app.use(paths.PROFILES, profileRoute);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;