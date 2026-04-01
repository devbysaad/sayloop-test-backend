'use strict';

const cron = require('node-cron');
const { getDb } = require('../config/database');

const MATCH_PENDING_TTL_MS  = 5  * 60 * 1000;   // 5 minutes for pending matches
const MATCH_ACCEPTED_TTL_MS = 10 * 60 * 1000;   // 10 minutes for accepted matches

// ── DB resilience wrapper ─────────────────────────────────────────────────────
/**
 * Wraps a getDb() call with retry + backoff.
 * Uses the SHARED singleton Prisma client from database.js so the scheduler
 * never opens extra connections on top of what the HTTP layer already holds.
 * NEVER re-throws — cron failures must not crash PM2.
 */
async function withResilience(label, fn, maxRetries = 3) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getDb(fn);
    } catch (err) {
      console.error(
        `[Scheduler][${label}] Attempt ${attempt}/${maxRetries} failed: ${err.message}`
      );
      if (attempt < maxRetries) {
        console.warn(`[Scheduler][${label}] Retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 30_000);
      } else {
        console.error(
          `[Scheduler][${label}] All ${maxRetries} attempts failed. Skipping this tick.`
        );
        return null;
      }
    }
  }
}

// ── Cron jobs ─────────────────────────────────────────────────────────────────

const startScheduler = () => {

  // Expire stale PENDING matches every minute
  cron.schedule('* * * * *', async () => {
    await withResilience('expire-pending', async (db) => {
      const cutoff = new Date(Date.now() - MATCH_PENDING_TTL_MS);
      const result = await db.match.updateMany({
        where: { status: 'PENDING', createdAt: { lt: cutoff } },
        data:  { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        console.log(`[Scheduler] Expired ${result.count} stale PENDING matches`);
      }
    });
  });

  // Expire stale ACCEPTED matches every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await withResilience('expire-accepted', async (db) => {
      const cutoff = new Date(Date.now() - MATCH_ACCEPTED_TTL_MS);
      const result = await db.match.updateMany({
        where: { status: 'ACCEPTED', updatedAt: { lt: cutoff } },
        data:  { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        console.log(`[Scheduler] Expired ${result.count} stale ACCEPTED matches`);
      }
    });
  });

  // Reset weekly leaderboard XP every Monday at 00:00 UTC
  cron.schedule('0 0 * * 1', async () => {
    await withResilience('weekly-xp-reset', async (db) => {
      const result = await db.user.updateMany({ data: { xpThisWeek: 0 } });
      console.log(`[Scheduler] Weekly XP reset — cleared xpThisWeek for ${result.count} users`);
    });
  });

  // Reset streaks at 00:01 UTC for users who missed yesterday
  cron.schedule('1 0 * * *', async () => {
    await withResilience('daily-streak-reset', async (db) => {
      const nowUTC       = new Date();
      const todayUTC     = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()));
      const yesterdayUTC = new Date(todayUTC.getTime() - 86_400_000);

      const result = await db.user.updateMany({
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
    });
  });

  // Daily quest refresh at midnight — placeholder
  cron.schedule('0 0 * * *', () => {
    console.log('[Scheduler] Daily quest refresh tick');
  });

  // Hourly streak safety-net log
  cron.schedule('0 * * * *', () => {
    console.log('[Scheduler] Hourly streak check tick');
  });

  console.log('✓ Scheduler started (resilient mode — DB errors will NOT crash PM2)');
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[Scheduler] SIGTERM received — scheduler stopped');
});

module.exports = { startScheduler };
