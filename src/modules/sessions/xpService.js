/**
 * SayLoop — XP Service
 *
 * Transparent, anti-cheat XP calculation. All rules documented here.
 * No AI, no magic — only real measurable actions.
 *
 * Anti-cheat rules enforced server-side:
 *   1. Session must last MIN_SESSION_FOR_XP seconds → else 0 XP for both
 *   2. User must have spoken MIN_SPEAKING_FOR_XP seconds → else 0 XP
 *   3. speakingTime is server-capped at 1s per tick (no spam)
 *   4. Resigned users get penalty, opponent gets bonus
 */

const {
  MIN_SESSION_FOR_XP,
  MIN_SPEAKING_FOR_XP,
  SPEAKING_BONUS_THRESHOLD,
} = require('../../config/sessionConfig');

const prisma = require('../../config/database');

/**
 * @typedef {Object} UserStats
 * @property {number} id            - DB user id
 * @property {number} speakingTime  - seconds mic was ON during active session
 * @property {boolean} inactive     - true if auto-resigned due to mic-off
 * @property {boolean} resigned     - true if manually or auto resigned
 */

/**
 * Calculate XP for both users after a session ends.
 * Returns XP deltas (can be negative).
 *
 * @param {UserStats} u1
 * @param {UserStats} u2
 * @param {number} sessionDuration - how long the session actually lasted (seconds)
 * @returns {{ xp1: number, xp2: number, breakdown1: string[], breakdown2: string[] }}
 */
function calculateXP(u1, u2, sessionDuration) {
  let xp1 = 0;
  let xp2 = 0;
  const breakdown1 = [];
  const breakdown2 = [];

  // ── Anti-cheat gate: session too short → no XP ──────────────────────────
  if (sessionDuration < MIN_SESSION_FOR_XP) {
    return {
      xp1: 0, xp2: 0,
      breakdown1: ['Session too short — no XP awarded'],
      breakdown2: ['Session too short — no XP awarded'],
    };
  }

  // ── Per-user XP calculation ───────────────────────────────────────────────
  for (const [user, other, xpRef, bd] of [
    [u1, u2, [xp1], breakdown1],
    [u2, u1, [xp2], breakdown2],
  ]) {
    // Anti-cheat: must have spoken at least MIN_SPEAKING_FOR_XP seconds
    if (user.speakingTime < MIN_SPEAKING_FOR_XP && !user.resigned) {
      bd.push(`Spoke only ${user.speakingTime}s — minimum ${MIN_SPEAKING_FOR_XP}s required for XP`);
      continue;
    }

    if (user.resigned) {
      // Resign penalty — no base XP, only penalty
      xpRef[0] -= 15;
      bd.push('-15 XP (resigned/auto-resigned)');
      // Give opponent the win bonus
      if (other.id === u1.id) xp1 += 15;
      else xp2 += 15;
      if (other.id === u1.id) breakdown1.push('+15 XP (opponent resigned — win bonus)');
      else breakdown2.push('+15 XP (opponent resigned — win bonus)');
    } else {
      // Base participation XP
      xpRef[0] += 10;
      bd.push('+10 XP (completed session)');

      // Speaking threshold bonus
      if (user.speakingTime >= SPEAKING_BONUS_THRESHOLD) {
        xpRef[0] += 10;
        bd.push('+10 XP (spoke 60+ seconds)');
      }

      // Speaking majority bonus (who talked more)
      if (user.speakingTime > other.speakingTime) {
        xpRef[0] += 10;
        bd.push('+10 XP (spoke more than partner)');
      }

      // Active consistency bonus
      if (!user.inactive) {
        xpRef[0] += 5;
        bd.push('+5 XP (stayed active throughout)');
      }
    }

    // Apply accumulated xpRef back to main variable
    if (user.id === u1.id) xp1 = xpRef[0];
    else xp2 = xpRef[0];
  }

  return { xp1, xp2, breakdown1, breakdown2 };
}

/**
 * Persist XP to DB for both users.
 * Ensures XP never goes below 0.
 */
async function applyXP(userId1, userId2, xp1, xp2) {
  const ops = [];

  if (xp1 !== 0) {
    if (xp1 > 0) {
      ops.push(prisma.user.update({ where: { id: userId1 }, data: { points: { increment: xp1 } } }));
    } else {
      // Decrement but floor at 0 — not possible in a single Prisma op without raw SQL,
      // so we cap using a workaround: read then update
      const u = await prisma.user.findUnique({ where: { id: userId1 }, select: { points: true } });
      const newPoints = Math.max(0, (u?.points ?? 0) + xp1);
      ops.push(prisma.user.update({ where: { id: userId1 }, data: { points: newPoints } }));
    }
  }

  if (xp2 !== 0) {
    if (xp2 > 0) {
      ops.push(prisma.user.update({ where: { id: userId2 }, data: { points: { increment: xp2 } } }));
    } else {
      const u = await prisma.user.findUnique({ where: { id: userId2 }, select: { points: true } });
      const newPoints = Math.max(0, (u?.points ?? 0) + xp2);
      ops.push(prisma.user.update({ where: { id: userId2 }, data: { points: newPoints } }));
    }
  }

  if (ops.length) await prisma.$transaction(ops);
}

/**
 * Placeholder for future debate winner detection.
 * @param {UserStats} user
 * @returns {boolean}
 */
function isWinner(user) {
  // TODO: implement debate scoring logic
  return false;
}

module.exports = { calculateXP, applyXP, isWinner };
