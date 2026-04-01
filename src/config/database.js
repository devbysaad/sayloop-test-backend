'use strict';

const { PrismaClient } = require('@prisma/client');

// ── Connection-error codes that warrant a full client reconnect ───────────────
const RECONNECT_CODES = new Set(['P1001', 'P1002', 'P2024']); // P2024 = pool timeout
const RECONNECT_MSGS  = ["Can't reach database", 'connect ECONNREFUSED', 'Connection refused', 'connection timeout', 'connection pool'];

function isConnectionError(err) {
  if (RECONNECT_CODES.has(err?.code)) return true;
  return RECONNECT_MSGS.some((m) => err?.message?.includes(m));
}

// ── Singleton state ───────────────────────────────────────────────────────────
let _client = null;
let _reconnecting = false;

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

function getClient() {
  if (!_client) {
    _client = global.__prisma ?? createClient();
    if (process.env.NODE_ENV !== 'production') global.__prisma = _client;
  }
  return _client;
}

// ── Resilient query wrapper ───────────────────────────────────────────────────
/**
 * Execute a Prisma callback with automatic reconnect on Neon cold-start errors.
 *
 * Usage (replaces bare prisma.xxx calls):
 *   const { getDb } = require('../config/database');
 *   const user = await getDb((db) => db.user.findUnique({ where: { clerkId } }));
 *
 * @param {(db: PrismaClient) => Promise<T>} fn
 * @param {number} maxRetries
 * @returns {Promise<T>}
 */
async function getDb(fn, maxRetries = 3) {
  let delay = 500;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(getClient());
    } catch (err) {
      if (!isConnectionError(err) || attempt === maxRetries) throw err;

      console.warn(
        `[DB] Connection lost (${err.code ?? err.message}) — reconnecting (attempt ${attempt}/${maxRetries}) in ${delay}ms…`
      );

      if (!_reconnecting) {
        _reconnecting = true;
        try { await _client?.$disconnect(); } catch (_) { /* ignore */ }
        _client = null;
        if (process.env.NODE_ENV !== 'production') global.__prisma = null;
        _reconnecting = false;
      }

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 10_000);
    }
  }
}

// ── Startup connect with retry (used by server.js) ────────────────────────────
async function connectWithRetry(retries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await getClient().$connect();
      console.log('✓ Database connected (Prisma)');
      return;
    } catch (err) {
      console.warn(`[DB] Startup attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) {
        console.warn('[DB] Could not pre-connect. Server will start anyway — getDb() reconnects on every request.');
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

// ── Backward-compat: existing code that does `const prisma = require('../config/database')` ──
// Keep working — raw client is still exported as default.
// But prefer getDb() for all new call-sites so reconnect is transparent.
const prisma = getClient();
module.exports = prisma;
module.exports.getDb = getDb;
module.exports.connectWithRetry = connectWithRetry;