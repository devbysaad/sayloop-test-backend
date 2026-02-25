const express = require('express');
const cors = require('cors');
const { globalLimiter } = require('./middleware/rateLimit.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { logger } = require('./middleware/logger.middleware');
const paths = require('./config/constants');

// Route imports
const userRoute = require('./modules/users/user.route');
const courseRoute = require('./modules/courses/course.route');
const lessonRoute = require('./modules/lessons/lesson.route');
const exerciseRoute = require('./modules/exercises/exercise.route');
const debateRoute = require('./modules/debates/debate.route');
const matchRoute = require('./modules/match/match.route');
const sessionRoute = require('./modules/sessions/session.route');
const leaderboardRoute = require('./modules/leaderboard/leaderboard.route');
const questRoute = require('./modules/quests/quest.route');
const progressRoute = require('./modules/progress/progress.route');
const levelRoute = require('./modules/levels/level.route');
const heartRoute = require('./modules/hearts/heart.route');
const gemRoute = require('./modules/gems/gem.route');
const streakRoute = require('./modules/streaks/streak.route');
const leagueRoute = require('./modules/leagues/league.route');
const notificationRoute = require('./modules/notifications/notification.route');
const profileRoute = require('./modules/profiles/profile.route');
const friendRoute = require('./modules/friends/friend.route');
const shopRoute = require('./modules/shop/shop.route');
const aiRoute = require('./modules/ai/ai.route');
const adminRoute = require('./modules/admin/admin.route');

const app = express();

// ── Global Middleware ─────────────────────────────────
app.use(logger);
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sayloop-test-jncm.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(globalLimiter);

// ── Health Check ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Sayloop API is running', status: 'healthy' });
});

// ── Mount Routes ──────────────────────────────────────
app.use(paths.USERS, userRoute);
app.use(paths.COURSES, courseRoute);
app.use(paths.LESSONS, lessonRoute);
app.use(paths.EXERCISES, exerciseRoute);
app.use(paths.DEBATES, debateRoute);
app.use(paths.MATCHES, matchRoute);
app.use(paths.SESSIONS, sessionRoute);
app.use(paths.LEADERBOARD, leaderboardRoute);
app.use(paths.QUESTS, questRoute);
app.use(paths.PROGRESS, progressRoute);
app.use(paths.LEVELS, levelRoute);
app.use(paths.HEARTS, heartRoute);
app.use(paths.GEMS, gemRoute);
app.use(paths.STREAKS, streakRoute);
app.use(paths.LEAGUES, leagueRoute);
app.use(paths.NOTIFICATIONS, notificationRoute);
app.use(paths.PROFILES, profileRoute);
app.use(paths.FRIENDS, friendRoute);
app.use(paths.SHOP, shopRoute);
app.use(paths.AI, aiRoute);
app.use(paths.ADMIN, adminRoute);

// ── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────
app.use(errorHandler);

module.exports = app;