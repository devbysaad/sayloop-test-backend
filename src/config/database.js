const { PrismaClient } = require('@prisma/client');

const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}


async function connectWithRetry(retries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Database connected (Prisma)');
      return;
    } catch (err) {
      console.warn(`DB attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) {
        console.error('Could not pre-connect. Server will start anyway — Prisma reconnects on first query.');
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

module.exports = prisma;
module.exports.connectWithRetry = connectWithRetry;