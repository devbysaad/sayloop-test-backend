/**
 * config/database.js
 * Singleton PrismaClient with Neon cold-start retry.
 * NEVER create `new PrismaClient()` anywhere else — always require this file.
 */
const { PrismaClient } = require('@prisma/client');

const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/**
 * connectWithRetry — call this in server.js instead of prisma.$connect()
 * Neon serverless databases can take a few seconds to wake from idle.
 * Errors are non-fatal after all retries: Prisma reconnects lazily on first query.
 */
async function connectWithRetry(retries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('✓ Database connected (Prisma)');
      return;
    } catch (err) {
      console.warn(`✗ DB attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) {
        console.error('⚠ Could not pre-connect. Server will start anyway — Prisma reconnects on first query.');
        return; // ← do NOT throw; keeps server alive
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

module.exports = prisma;
module.exports.connectWithRetry = connectWithRetry;