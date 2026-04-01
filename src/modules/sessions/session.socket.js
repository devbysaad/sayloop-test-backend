/**
 * SayLoop — Session Socket Handler (Server-Authoritative)
 *
 * Design principles:
 *  1. Server is ALWAYS the source of truth for timer. Never trust client.
 *  2. Mic tracking uses timestamps, not counters — prevents desync.
 *  3. session:end fires ONCE only (guarded by session.ended flag).
 *  4. XP calculated server-side, never client-side.
 *  5. Disconnect is treated as resign.
 */

const matchesService = require('../match/match.service');
const { processSessionEconomy } = require('../economy/xp.service');
const {
  SESSION_DURATION,
  MIC_OFF_LIMIT,
  WARNING_BEFORE_RESIGN,
} = require('../../config/sessionConfig');

// ─── In-memory maps ───────────────────────────────────────────────────────────
// socketId → sessionId
const socketRooms = new Map();

// topic → [{ userId, socketId, timestamp }]
const queue = new Map();

/**
 * sessionState shape:
 * {
 *   [sessionId]: {
 *     ended: boolean,
 *     timerInterval: NodeJS.Timeout,
 *     startedAt: number,       // ms timestamp
 *     endsAt: number,          // ms timestamp
 *     users: {
 *       [userId]: {
 *         socketId: string,
 *         speakingTime: number,    // seconds (server-capped at 1/tick)
 *         micOffStart: number|null, // timestamp when mic went OFF (null = mic ON)
 *         lastMicOnAt: number,     // timestamp of last mic ON event
 *         inactive: boolean,
 *         resigned: boolean,
 *         warningInterval: NodeJS.Timeout|null,
 *       }
 *     }
 *   }
 * }
 */
const sessionState = new Map();

// ─── Queue helpers ────────────────────────────────────────────────────────────
function enqueue(topic, entry) {
  if (!queue.has(topic)) queue.set(topic, []);
  queue.set(topic, queue.get(topic).filter((e) => e.userId !== entry.userId));
  queue.get(topic).push(entry);
}

function dequeue(topic, userId) {
  if (!queue.has(topic)) return;
  queue.set(topic, queue.get(topic).filter((e) => e.userId !== userId));
}

function findOpponent(topic, userId) {
  return (queue.get(topic) ?? []).find((e) => e.userId !== userId) ?? null;
}

/** Allow other modules (e.g. match.socket) to register a socket → room mapping */
function setSocketRoom(socketId, sessionId) {
  socketRooms.set(socketId, sessionId);
}

// ─── Session lifecycle helpers ───────────────────────────────────────────────

function createSessionState(sessionId, userId1, socketId1, userId2, socketId2) {
  const now = Date.now();
  sessionState.set(sessionId, {
    ended: false,
    timerInterval: null,
    warningIntervals: {},
    startedAt: now,
    endsAt: now + SESSION_DURATION * 1000,
    users: {
      [userId1]: {
        socketId: socketId1,
        speakingTime: 0,
        micOffStart: null,
        lastMicOnAt: now,
        inactive: false,
        resigned: false,
        warningInterval: null,
      },
      [userId2]: {
        socketId: socketId2,
        speakingTime: 0,
        micOffStart: null,
        lastMicOnAt: now,
        inactive: false,
        resigned: false,
        warningInterval: null,
      },
    },
  });
}

/**
 * Public entry: initialise session state + start timer for a given room.
 * Idempotent — returns false (and does nothing) if session already exists.
 * Used by match.socket.js when BOTH users have joined via match:join-session.
 */
function initSessionForRoom(io, sessionId, userId1, socketId1, userId2, socketId2) {
  if (sessionState.has(sessionId)) return false; // already running
  createSessionState(sessionId, userId1, socketId1, userId2, socketId2);
  // Emit session:start to the room
  io.to(sessionId).emit('session:start', {
    sessionId,
    durationSeconds: SESSION_DURATION,
    startedAt: sessionState.get(sessionId).startedAt,
  });
  startTimer(io, sessionId);
  return true;
}

/**
 * End a session exactly once.
 * Calculates XP, persists to DB, emits session:end to both users.
 */
async function endSession(io, sessionId, { resignedUserId = null } = {}) {
  const sess = sessionState.get(sessionId);
  if (!sess || sess.ended) return; // double-emit protection
  sess.ended = true;

  // Stop timer
  if (sess.timerInterval) { clearInterval(sess.timerInterval); sess.timerInterval = null; }

  // Stop any mic warning intervals + mark resigned user
  for (const uid of Object.keys(sess.users)) {
    const u = sess.users[uid];
    if (u.warningInterval) { clearInterval(u.warningInterval); u.warningInterval = null; }
    if (resignedUserId && Number(uid) === resignedUserId) {
      u.resigned = true;
      u.inactive = true;
    }
  }

  const userIds = Object.keys(sess.users).map(Number);
  const [u1id, u2id] = userIds;
  const u1 = sess.users[u1id];
  const u2 = u2id ? sess.users[u2id] : null;

  const sessionDuration = Math.floor((Date.now() - sess.startedAt) / 1000);

  // ── Determine outcome ─────────────────────────────────────────────────────
  let outcome = 'DRAW';

  const u1Resigned = u1?.resigned || u1?.inactive;
  const u2Resigned = u2?.resigned || u2?.inactive;

  if (u1Resigned && u2Resigned) {
    outcome = 'INCOMPLETE';
  } else if (u1Resigned) {
    // u1 is requester (first in map), u2 is receiver
    outcome = 'RESIGN_REQUESTER';
  } else if (u2Resigned) {
    outcome = 'RESIGN_RECEIVER';
  } else if (sessionDuration < 30) {
    // Short session — no winner, no loser
    outcome = 'INCOMPLETE';
  } else {
    // Time-based win: whoever spoke more wins
    if (u1.speakingTime > u2.speakingTime) {
      outcome = 'WIN_REQUESTER';
    } else if (u2.speakingTime > u1.speakingTime) {
      outcome = 'WIN_RECEIVER';
    } else {
      outcome = 'DRAW';
    }
  }

  console.log(`[Session] Ended sessionId=${sessionId} outcome=${outcome} duration=${sessionDuration}s`);

  // ── Find the matchId from sessionId ──────────────────────────────────────
  let matchId = null;
  try {
    const { getDb } = require('../../config/database');
    const match = await getDb((db) => db.match.findFirst({
      where: { sessionId },
      select: { id: true },
    }));
    if (match) {
      matchId = match.id;
      // Update match outcome if not INCOMPLETE
      if (outcome !== 'INCOMPLETE') {
        await getDb((db) => db.match.update({
          where: { id: matchId },
          data: { outcome, xpAwarded: true, status: 'COMPLETED' },
        }));
      }
    }
  } catch (dbErr) {
    console.error('[Session] Match DB update failed:', dbErr.message);
  }

  // ── Process economy (XP, gems, streaks, level-ups) ────────────────────────
  let economyResults = null;
  if (outcome !== 'INCOMPLETE') {
    try {
      economyResults = await processSessionEconomy(u1id, u2id, outcome, matchId, io);
    } catch (econErr) {
      console.error('[Economy] processSessionEconomy failed:', econErr.message);
    }
  }

  // ── Emit session:end + economy:update to each user ────────────────────────
  const emitToUser = (userId, socketId, resigned) => {
    const ud = sess.users[userId];
    if (!ud) return;

    // Basic session result
    io.to(socketId).emit('session:end', {
      sessionDuration,
      outcome,
      resigned,
      speakingTime: ud.speakingTime,
    });

    // Economy update (if processed successfully)
    if (economyResults) {
      const isRequester = userId === u1id;
      const economyData = isRequester ? economyResults.requester : economyResults.receiver;

      // Emit to user's private room (user:{id}) so it reaches all their sockets
      io.to(`user:${userId}`).emit('economy:update', {
        ...economyData,
        outcome,
        sessionDuration,
      });
    }
  };

  if (u1id && u1) emitToUser(u1id, u1.socketId, u1Resigned);
  if (u2id && u2) emitToUser(u2id, u2.socketId, u2Resigned);

  // Clean up after a short delay (allow clients to receive events)
  setTimeout(() => sessionState.delete(sessionId), 5000);
}

/**
 * Start the server-authoritative 1-second countdown for a session.
 */
function startTimer(io, sessionId) {
  const sess = sessionState.get(sessionId);
  if (!sess) return;

  sess.timerInterval = setInterval(async () => {
    const s = sessionState.get(sessionId);
    if (!s || s.ended) return;

    const secondsLeft = Math.max(0, Math.floor((s.endsAt - Date.now()) / 1000));
    io.to(sessionId).emit('timer:update', { secondsLeft });

    if (secondsLeft === 0) {
      await endSession(io, sessionId);
    }
  }, 1000);
}

/**
 * Handle mic-off tracking for a user.
 * Uses timestamps to avoid desync. Warning emitted at MIC_OFF_LIMIT - WARNING_BEFORE_RESIGN.
 */
function handleMicOff(io, sessionId, userId) {
  const sess = sessionState.get(sessionId);
  if (!sess || sess.ended) return;
  const user = sess.users[userId];
  if (!user || user.resigned) return;

  // Record when mic went off
  user.micOffStart = Date.now();
  user.lastMicOnAt = null;

  // Clear any previous warning interval
  if (user.warningInterval) { clearInterval(user.warningInterval); user.warningInterval = null; }

  // Poll every second to check mic duration
  user.warningInterval = setInterval(async () => {
    const s = sessionState.get(sessionId);
    if (!s || s.ended) { clearInterval(user.warningInterval); return; }
    const u = s.users[userId];
    if (!u || u.micOffStart === null) { clearInterval(u.warningInterval); u.warningInterval = null; return; }

    const micOffDuration = (Date.now() - u.micOffStart) / 1000;

    // Emit warning when in the danger zone
    const warningStart = MIC_OFF_LIMIT - WARNING_BEFORE_RESIGN;
    if (micOffDuration >= warningStart && micOffDuration < MIC_OFF_LIMIT) {
      const secondsLeft = Math.ceil(MIC_OFF_LIMIT - micOffDuration);
      io.to(u.socketId).emit('mic:warning', { secondsLeft });
    }

    // Auto-resign if limit hit
    if (micOffDuration >= MIC_OFF_LIMIT) {
      clearInterval(u.warningInterval);
      u.warningInterval = null;
      console.log(`[Session] Auto-resign userId=${userId} (mic off ${micOffDuration.toFixed(1)}s)`);
      u.inactive = true;
      u.resigned = true;

      io.to(u.socketId).emit('user:resigned', { reason: 'mic_inactive' });
      io.to(sessionId).emit('user:resigned', { userId, reason: 'mic_inactive' });
      await endSession(io, sessionId, { resignedUserId: userId });
    }
  }, 1000);
}

// ─── Main socket registration ─────────────────────────────────────────────────
function registerSessionHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.dbUserId;
    console.log(`[Socket] Connected — dbUserId:${userId} socketId:${socket.id}`);

    // ── Helper: emit to everyone else in session room ──────────────────────
    const emitToRoom = (event, data) => {
      const room = socketRooms.get(socket.id);
      if (room) socket.to(room).emit(event, data);
    };

    const getSession = () => {
      const room = socketRooms.get(socket.id);
      return room ? sessionState.get(room) : null;
    };

    // ── find-partner ───────────────────────────────────────────────────────
    socket.on('find-partner', async ({ topic }) => {
      const opponent = findOpponent(topic, userId);

      if (opponent) {
        dequeue(topic, userId);
        dequeue(topic, opponent.userId);

        let sessionId;
        try {
          const matchRecord = await matchesService.requestMatch({
            userId,
            partnerId: opponent.userId,
            topic,
          });
          const accepted = await matchesService.acceptMatch(matchRecord.id, opponent.userId);
          sessionId = accepted.sessionId;
        } catch (err) {
          console.error('[Socket] Match DB error:', err.message);
          sessionId = `session_${Date.now()}`;
        }

        socket.join(sessionId);
        const opponentSocket = io.sockets.sockets.get(opponent.socketId);
        if (opponentSocket) opponentSocket.join(sessionId);
        socketRooms.set(socket.id, sessionId);
        socketRooms.set(opponent.socketId, sessionId);

        // Initialise server-side session tracking
        createSessionState(sessionId, userId, socket.id, opponent.userId, opponent.socketId);

        // Emit matched to both
        socket.emit('matched', {
          sessionId, isInitiator: true,
          partner: { userId: opponent.userId, socketId: opponent.socketId, username: null, firstName: null, pfpSource: null },
        });
        io.to(opponent.socketId).emit('matched', {
          sessionId, isInitiator: false,
          partner: { userId, socketId: socket.id, username: null, firstName: null, pfpSource: null },
        });

        // Emit session:start then begin countdown
        io.to(sessionId).emit('session:start', {
          sessionId,
          durationSeconds: SESSION_DURATION,
          startedAt: sessionState.get(sessionId).startedAt,
        });
        startTimer(io, sessionId);

        console.log(`[Session] Started sessionId=${sessionId} between ${userId} and ${opponent.userId}`);
      } else {
        enqueue(topic, { userId, socketId: socket.id, timestamp: Date.now() });
        socket.emit('waiting', `Looking for a ${topic} partner...`);
      }
    });

    // ── WebRTC signalling ──────────────────────────────────────────────────
    socket.on('offer', ({ offer, to }) => io.to(to).emit('offer', { offer, from: socket.id }));
    socket.on('answer', ({ answer, to }) => io.to(to).emit('answer', { answer }));
    socket.on('ice-candidate', ({ candidate, to }) => io.to(to).emit('ice-candidate', { candidate }));

    // ── Chat & debate ──────────────────────────────────────────────────────
    socket.on('chat-message', (data) => emitToRoom('chat-message', data));
    socket.on('debate-argument', (data) => emitToRoom('debate-argument', data));

    // ── Emoji reactions ────────────────────────────────────────────────────
    socket.on('emoji:react', ({ emoji }) => {
      if (typeof emoji !== 'string') return;
      emitToRoom('emoji:react', { emoji, fromUserId: userId });
    });

    // ── Draw ───────────────────────────────────────────────────────────────
    socket.on('offer-draw', () => emitToRoom('draw-received'));
    socket.on('accept-draw', () => emitToRoom('draw-accepted', { xpEarned: 15 }));
    socket.on('decline-draw', () => emitToRoom('draw-declined'));

    // ── Resign (manual) ───────────────────────────────────────────────────
    socket.on('resign', async () => {
      const room = socketRooms.get(socket.id);
      console.log(`[Session] Resign received from userId=${userId} room=${room}`);
      if (!room) {
        console.warn('[Session] Resign: no room found for socket', socket.id);
        return;
      }
      const sess = sessionState.get(room);
      if (!sess) {
        console.warn('[Session] Resign: no session state for room', room);
        return;
      }
      if (sess.ended) return;
      if (sess.users[userId]) {
        sess.users[userId].resigned = true;
        sess.users[userId].inactive = true;
      }
      console.log(`[Session] ✅ Processing resign for userId=${userId}`);
      socket.to(room).emit('opponent-resigned', { winnerId: null, xpEarned: 30 });
      await endSession(io, room, { resignedUserId: userId });
    });

    // ── Mic status ─────────────────────────────────────────────────────────
    socket.on('mic:status', ({ isOn }) => {
      const room = socketRooms.get(socket.id);
      if (!room) return;
      const sess = sessionState.get(room);
      if (!sess || sess.ended) return;
      const user = sess.users[userId];
      if (!user) return;

      console.log(`[Session] mic:status userId=${userId} isOn=${isOn}`);

      if (isOn) {
        user.micOffStart = null;
        user.lastMicOnAt = Date.now();
        if (user.warningInterval) { clearInterval(user.warningInterval); user.warningInterval = null; }
        socket.emit('mic:warning:cleared');
      } else {
        if (user.micOffStart === null) {
          handleMicOff(io, room, userId);
        }
      }
    });

    // ── Speaking tick ──────────────────────────────────────────────────────
    socket.on('speaking:tick', () => {
      const room = socketRooms.get(socket.id);
      if (!room) return;
      const sess = sessionState.get(room);
      if (!sess || sess.ended) return;
      const user = sess.users[userId];
      if (!user || user.resigned) return;
      if (user.micOffStart !== null) return;
      if (user.speakingTime < SESSION_DURATION) {
        user.speakingTime += 1;
      }
    });

    // ── Leave / disconnect ────────────────────────────────────────────────
    const handleLeave = async (reason) => {
      queue.forEach((_, topic) => dequeue(topic, userId));
      const room = socketRooms.get(socket.id);
      if (room) {
        const sess = sessionState.get(room);
        if (sess && !sess.ended) {
          // Treat disconnect as resign
          if (sess.users[userId]) {
            sess.users[userId].resigned = true;
            sess.users[userId].inactive = true;
          }
          emitToRoom('partner-disconnected');
          await endSession(io, room, { resignedUserId: userId });
        }
        socket.leave(room);
      }
      socketRooms.delete(socket.id);
      console.log(`[Socket] ${reason} — userId:${userId} socketId:${socket.id}`);
    };

    socket.on('leave-session', () => handleLeave('leave-session'));
    socket.on('disconnect', () => handleLeave('disconnect'));
  });
}

module.exports = { registerSessionHandlers, setSocketRoom, initSessionForRoom };