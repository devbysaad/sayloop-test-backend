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

  // Reset weekly leaderboard every Monday at midnight
  cron.schedule('0 0 * * 1', async () => {
    console.log('Running weekly leaderboard reset...');
  });

  // Refresh daily quests every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily quest refresh...');
  });

  // Check streaks every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running streak check...');
  });

  console.log('✓ Scheduler started (includes match expiry)');
};

module.exports = { startScheduler };
