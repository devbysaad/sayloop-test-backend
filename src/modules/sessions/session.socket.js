const matchesService = require('../match/match.service');

// ─── In-memory state ──────────────────────────────────────────────────────────
// NOTE: This is process-level state. Add Redis adapter for multi-instance deployments.
// topic → [{ userId, socketId, timestamp }]
const queue = new Map();
// socketId → sessionId
const socketRooms = new Map();

/** Allow other modules (e.g. match.socket) to register a socket → room mapping */
function setSocketRoom(socketId, sessionId) {
  socketRooms.set(socketId, sessionId);
}

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

// ─────────────────────────────────────────────────────────────────────────────

function registerSessionHandlers(io) {
  io.on('connection', (socket) => {
    // socket.dbUserId is set by the Clerk JWT middleware in server.js.
    // NEVER trust a userId from the socket event payload for identity decisions.
    const userId = socket.dbUserId;
    console.log(`[Socket] Connected — dbUserId:${userId} socketId:${socket.id}`);

    // ── find-partner ──────────────────────────────────────────────────────────
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
          // requestMatch returns the full match object (has .id, not .matchId)
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

        socket.emit('matched', {
          sessionId,
          isInitiator: true,
          partner: {
            userId: opponent.userId,
            socketId: opponent.socketId,
            username: null,
            firstName: null,
            pfpSource: null,
          },
        });

        io.to(opponent.socketId).emit('matched', {
          sessionId,
          isInitiator: false,
          partner: {
            userId,
            socketId: socket.id,
            username: null,
            firstName: null,
            pfpSource: null,
          },
        });
      } else {
        enqueue(topic, { userId, socketId: socket.id, timestamp: Date.now() });
        socket.emit('waiting', `Looking for a ${topic} partner...`);
      }
    });

    // ── Helper: emit only to the matched partner ──────────────────────────────
    const emitToRoom = (event, data) => {
      const room = socketRooms.get(socket.id);
      if (room) socket.to(room).emit(event, data);
    };

    // ── WebRTC signalling ─────────────────────────────────────────────────────
    socket.on('offer', ({ offer, to }) => io.to(to).emit('offer', { offer, from: socket.id }));
    socket.on('answer', ({ answer, to }) => io.to(to).emit('answer', { answer }));
    socket.on('ice-candidate', ({ candidate, to }) => io.to(to).emit('ice-candidate', { candidate }));

    // ── Chat & debate ─────────────────────────────────────────────────────────
    socket.on('chat-message', (data) => emitToRoom('chat-message', data));
    socket.on('debate-argument', (data) => emitToRoom('debate-argument', data));

    // ── Draw ──────────────────────────────────────────────────────────────────
    socket.on('offer-draw', () => emitToRoom('draw-received'));
    socket.on('accept-draw', () => emitToRoom('draw-accepted', { xpEarned: 15 }));
    socket.on('decline-draw', () => emitToRoom('draw-declined'));

    // ── Resign ────────────────────────────────────────────────────────────────
    socket.on('resign', () => {
      emitToRoom('opponent-resigned', { winnerId: null, xpEarned: 30 });
    });

    // ── Leave / disconnect ────────────────────────────────────────────────────
    socket.on('leave-session', () => {
      queue.forEach((_, topic) => dequeue(topic, userId));
      emitToRoom('partner-disconnected');
      const room = socketRooms.get(socket.id);
      if (room) socket.leave(room);
      socketRooms.delete(socket.id);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected — socketId:${socket.id}`);
      queue.forEach((_, topic) => dequeue(topic, userId));
      emitToRoom('partner-disconnected');
      socketRooms.delete(socket.id);
    });
  });
}

module.exports = { registerSessionHandlers, setSocketRoom };