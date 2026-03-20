const cron = require('node-cron');
const prisma = require('../config/database');

const MATCH_PENDING_TTL_MS = 5 * 60 * 1000;   // 5 minutes for pending matches
const MATCH_ACCEPTED_TTL_MS = 10 * 60 * 1000;  // 10 minutes for accepted matches awaiting confirmation

const startScheduler = () => {
  // Expire stale PENDING matches every minute
  cron.schedule('* * * * *', async () => {
    try {
      const pendingCutoff = new Date(Date.now() - MATCH_PENDING_TTL_MS);
      const result = await prisma.match.updateMany({
        where: { status: 'PENDING', createdAt: { lt: pendingCutoff } },
        data: { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        console.log(`[Scheduler] Expired ${result.count} stale PENDING matches`);
      }
    } catch (err) {
      console.error('[Scheduler] Error expiring pending matches:', err.message);
    }
  });

  // Expire stale ACCEPTED matches every 5 minutes (user never clicked "Let's Go")
  cron.schedule('*/5 * * * *', async () => {
    try {
      const acceptedCutoff = new Date(Date.now() - MATCH_ACCEPTED_TTL_MS);
      const result = await prisma.match.updateMany({
        where: { status: 'ACCEPTED', updatedAt: { lt: acceptedCutoff } },
        data: { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        console.log(`[Scheduler] Expired ${result.count} stale ACCEPTED matches`);
      }
    } catch (err) {
      console.error('[Scheduler] Error expiring accepted matches:', err.message);
    }
  });

  // Reset weekly leaderboard XP every Monday at 00:00 UTC
  cron.schedule('0 0 * * 1', async () => {
    try {
      const result = await prisma.user.updateMany({
        data: { xpThisWeek: 0 },
      });
      console.log(`[Scheduler] Weekly XP reset — cleared xpThisWeek for ${result.count} users`);
    } catch (err) {
      console.error('[Scheduler] Weekly XP reset error:', err.message);
    }
  });

  // Reset streaks at 00:01 UTC for users who missed yesterday
  cron.schedule('1 0 * * *', async () => {
    try {
      const nowUTC = new Date();
      const todayUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()));
      // Yesterday midnight UTC
      const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);

      // Users whose lastActiveDate is older than yesterday (missed at least 1 full day)
      const result = await prisma.user.updateMany({
        where: {
          streakLength: { gt: 0 },
          OR: [
            { lastActiveDate: { lt: yesterdayUTC } },
            { lastActiveDate: null },
          ],
        },
        data: { streakLength: 0 },
      });
      console.log(`[Scheduler] Streak reset — reset ${result.count} users who missed a day`);
    } catch (err) {
      console.error('[Scheduler] Streak reset error:', err.message);
    }
  });

  // Daily quest refresh at midnight — placeholder for quest reset logic
  cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Daily quest refresh tick');
  });

  // Check streaks every hour — kept for monitoring/legacy compatibility
  cron.schedule('0 * * * *', async () => {
    // Streak enforcement is handled at session end; this is a safety net log
    console.log('[Scheduler] Hourly streak check tick');
  });

  console.log('✓ Scheduler started (includes match expiry)');
};

module.exports = { startScheduler };
