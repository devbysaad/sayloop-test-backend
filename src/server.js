require('dotenv').config();
require('./config/env');

const http = require('http');
const app = require('./app');
const database = require('./config/database');
const { getDb } = require('./config/database');
const { Server } = require('socket.io');
const { verifyToken } = require('@clerk/clerk-sdk-node');
const { registerSessionHandlers } = require('./modules/sessions/session.socket');
const { registerMatchHandlers } = require('./modules/match/match.socket');
const { startScheduler } = require('./utils/scheduler');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

const _prismaLegacy = database.prisma ?? database;

// ── Online user tracking ──────────────────────────────────────────────────────
const onlineUsers = new Set();
app.set('onlineUsers', onlineUsers);
const connectFn = database.connectWithRetry ?? null;

const socketOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://sayloop-test.vercel.app',
];
if (process.env.FRONTEND_URL && !socketOrigins.includes(process.env.FRONTEND_URL)) {
  socketOrigins.push(process.env.FRONTEND_URL);
}

const io = new Server(server, {
  cors: {
    origin: socketOrigins,
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
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      try {
        const user = await getDb((db) =>
          db.user.findUnique({ where: { clerkId: payload.sub }, select: { id: true } })
        );
        if (user) {
          socket.dbUserId = user.id;
          socket.join(`user:${user.id}`);
          onlineUsers.add(user.id);
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
      const user = await getDb((db) =>
        db.user.findUnique({ where: { clerkId }, select: { id: true } })
      );
      if (user) {
        socket.dbUserId = user.id;
        socket.join(`user:${user.id}`);
        onlineUsers.add(user.id);
        console.log(`[Socket] clerkId OK — dbUserId:${user.id} socketId:${socket.id}, joined room user:${user.id}`);
        return next();
      }
      console.warn(`[Socket] clerkId not in DB: ${clerkId}`);
      return next(new Error('User not synced. Call /api/users/sync first.'));
    } catch (err) {
      console.error(`[Socket] DB lookup failed: ${err.message}`);
      return next(new Error('Database unavailable — please try again shortly.'));
    }
  }

  console.warn('[Socket] Rejected — no token or clerkId in handshake');
  return next(new Error('Unauthorized: provide token or clerkId'));
});

// Clean up online tracking on disconnect
io.on('connection', (socket) => {
  socket.on('disconnect', async () => {
    if (!socket.dbUserId) return;
    // Only remove if this user has no other active sockets
    const room = `user:${socket.dbUserId}`;
    const sockets = await io.in(room).fetchSockets();
    if (sockets.length === 0) {
      onlineUsers.delete(socket.dbUserId);
      console.log(`[Socket] User ${socket.dbUserId} is now offline`);
    }
  });
});

registerSessionHandlers(io);
registerMatchHandlers(io);

const startServer = () => {
  // ── Start HTTP/WS server immediately ────────────────────────────────────────
  // Do NOT gate server.listen() on DB connectivity. The socket auth middleware
  // already handles DB errors gracefully per-request. This ensures the frontend
  // can connect to the server even if Neon DB is slow to wake up.
  server.listen(PORT, () => {
    console.log(`✓ HTTP  server listening on port ${PORT}`);
    console.log(`✓ WS    server listening on port ${PORT}`);
    startScheduler();
  });

  // ── Attempt DB connection in background ─────────────────────────────────────
  // If Neon is suspended or creds are missing locally, the server still starts.
  // Requests requiring DB will get errors until the connection is restored.
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set — DB features disabled. Copy .env.example to .env and fill in your credentials.');
    return;
  }

  const dbConnect = connectFn
    ? connectFn()
    : prisma.$connect().then(() => console.log('✓ Database connected (Prisma)'));

  dbConnect.catch((err) => {
    console.warn(`⚠️  DB connect failed: ${err.message}`);
    console.warn('   Check Neon console — compute may be suspended. Requests requiring DB will fail until restored.');
  });
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await _prismaLegacy.$disconnect().catch(() => {});
    console.log('✓ Server closed');
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();