require('dotenv').config();
require('./config/env');

const http = require('http');
const app = require('./app');
const database = require('./config/database');
const { Server } = require('socket.io');
const { verifyToken } = require('@clerk/clerk-sdk-node');
const { registerSessionHandlers } = require('./modules/sessions/session.socket');
const { registerMatchHandlers } = require('./modules/match/match.socket');
const { startScheduler } = require('./utils/scheduler');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

const prisma = database.prisma ?? database;
const connectFn = database.connectWithRetry ?? null;

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Expose io on the Express app so controllers can emit events after REST calls
app.set('io', io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const clerkId = socket.handshake.auth?.clerkId;

  // ── Path 1: JWT ───────────────────────────────────────────────────────────
  if (token) {
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY, // FIX: was CLERK_SECRET_KEY — that env var doesn't exist on the backend
      });
      try {
        const user = await prisma.user.findUnique({
          where: { clerkId: payload.sub },
          select: { id: true },
        });
        if (user) {
          socket.dbUserId = user.id;
          socket.join(`user:${user.id}`);
          console.log(`[Socket] JWT OK — dbUserId:${user.id} socketId:${socket.id}, joined room user:${user.id}`);
          return next();
        }
        return next(new Error('User not synced. Call /api/users/sync first.'));
      } catch (dbErr) {
        console.error(`[Socket] DB error during JWT path: ${dbErr.message}`);
        return next(new Error('Database unavailable — please try again shortly.'));
      }
    } catch (err) {
      console.warn(`[Socket] JWT failed (${err.message}) — trying clerkId fallback`);
    }
  }

  // ── Path 2: clerkId direct lookup ────────────────────────────────────────
  if (clerkId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      if (user) {
        socket.dbUserId = user.id;
        socket.join(`user:${user.id}`);
        console.log(`[Socket] clerkId OK — dbUserId:${user.id} socketId:${socket.id}, joined room user:${user.id}`);
        return next();
      }
      console.warn(`[Socket] clerkId not in DB: ${clerkId}`);
      return next(new Error('User not synced. Call /api/users/sync first.'));
    } catch (err) {
      const isDbError = err.message?.includes("Can't reach database") || err.message?.includes('connect');
      if (isDbError) {
        console.error(`[Socket] Database unreachable: ${err.message}`);
        return next(new Error('Database unavailable — please try again shortly.'));
      }
      console.error(`[Socket] DB lookup failed: ${err.message}`);
      return next(new Error('Auth resolution failed'));
    }
  }

  console.warn('[Socket] Rejected — no token or clerkId in handshake');
  return next(new Error('Unauthorized: provide token or clerkId'));
});

registerSessionHandlers(io);
registerMatchHandlers(io);

const startServer = async () => {
  if (connectFn) {
    await connectFn();
  } else {
    await prisma.$connect();
    console.log('✓ Database connected (Prisma)');
  }
  server.listen(PORT, () => {
    console.log(`✓ HTTP  server running on port ${PORT}`);
    console.log(`✓ WS    server running on port ${PORT}`);
    startScheduler();
  });
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✓ Server closed');
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();