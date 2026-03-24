'use strict';

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const MATCH_PENDING_TTL_MS  = 5  * 60 * 1000;   // 5 minutes for pending matches
const MATCH_ACCEPTED_TTL_MS = 10 * 60 * 1000;   // 10 minutes for accepted matches

// ── Dedicated Prisma client for scheduler ────────────────────────────────────
// Isolated from the main app client so DB failures in cron jobs
// never affect in-flight HTTP requests.
let prisma = new PrismaClient({ log: ['error'] });

// ── DB resilience wrapper ─────────────────────────────────────────────────────
/**
 * Wraps a Prisma operation with retry + exponential backoff.
 * Reconnects the client on Neon cold-start / connection errors.
 * NEVER re-throws — so cron failures cannot crash PM2.
 *
 * @param {string}   label      - Job name for log messages
 * @param {Function} fn         - async (db: PrismaClient) => any
 * @param {number}   maxRetries - defaults to 3
 */
async function withResilience(label, fn, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(prisma);
    } catch (err) {
      const isConnErr =
        err.message?.includes("Can't reach database") ||
        err.message?.includes('connect ECONNREFUSED') ||
        err.message?.includes('Connection refused') ||
        err.code === 'P1001' ||   // Neon: can't reach DB server
        err.code === 'P1002';     // Neon: DB timeout on pooler

      console.error(
        `[Scheduler][${label}] Attempt ${attempt}/${maxRetries} failed: ${err.message}`
      );

      if (isConnErr && attempt < maxRetries) {
        console.warn(
          `[Scheduler][${label}] DB connection lost — reconnecting in ${delay}ms…`
        );
        try {
          await prisma.$disconnect();
        } catch (_) { /* ignore disconnect errors */ }
        prisma = new PrismaClient({ log: ['error'] });
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 30_000); // exponential backoff, cap at 30s
      } else if (attempt === maxRetries) {
        console.error(
          `[Scheduler][${label}] All ${maxRetries} attempts failed. Skipping this tick.`
        );
        // ⚠️ DO NOT re-throw — would cause an unhandled rejection and crash PM2
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
      console.log(
        `[Scheduler] Weekly XP reset — cleared xpThisWeek for ${result.count} users`
      );
    });
  });

  // Reset streaks at 00:01 UTC for users who missed yesterday
  cron.schedule('1 0 * * *', async () => {
    await withResilience('daily-streak-reset', async (db) => {
      const nowUTC        = new Date();
      const todayUTC      = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );
      const yesterdayUTC  = new Date(todayUTC.getTime() - 86_400_000);

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
      console.log(
        `[Scheduler] Streak reset — reset ${result.count} users who missed a day`
      );
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
process.on('SIGTERM', async () => {
  console.log('[Scheduler] SIGTERM — disconnecting Prisma');
  await prisma.$disconnect().catch(() => {});
});

module.exports = { startScheduler };
