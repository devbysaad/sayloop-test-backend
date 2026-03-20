const prisma = require('../../config/database');
const { setSocketRoom, initSessionForRoom, startTimerForSession } = require('../sessions/session.socket');

// ─── Socket Page Tracking Maps ────────────────────────────────────────────────
const socketPageMap = new Map(); // socketId -> pageName
const socketUserMap = new Map(); // socketId -> dbUserId
const userSocketsMap = new Map(); // dbUserId -> Set<socketId>

// ─── In-memory readiness tracker ──────────────────────────────────────────────
// matchId → Set<userId>  — tracks which users have clicked "Let's Go"
const readyMap = new Map();

/**
 * Emit a socket event to a specific user's personal room.
 * Every authenticated socket auto-joins `user:${dbUserId}` in server.js.
 */
function emitToUser(io, userId, event, data) {
    io.to(`user:${userId}`).emit(event, data);
}

// ─── Socket handlers for match lifecycle ──────────────────────────────────────
function registerMatchHandlers(io) {
    io.on('connection', (socket) => {
        const userId = socket.dbUserId;
        if (!userId) return;

        // Track global socket connection
        socketUserMap.set(socket.id, userId);
        if (!userSocketsMap.has(userId)) userSocketsMap.set(userId, new Set());
        userSocketsMap.get(userId).add(socket.id);

        socket.on('disconnect', () => {
            // Clean up page tracking
            const prevPage = socketPageMap.get(socket.id);
            if (prevPage) {
                socketPageMap.delete(socket.id);
            }
            // Clean up user tracking
            socketUserMap.delete(socket.id);
            if (userSocketsMap.has(userId)) {
                userSocketsMap.get(userId).delete(socket.id);
                if (userSocketsMap.get(userId).size === 0) {
                    userSocketsMap.delete(userId);
                }
            }
        });

        // ── page:join ───────────────────────────────────────────────────────────
        // Emitted by the client via usePageTracking hook when they switch routes
        socket.on('page:join', ({ page }) => {
            const prevPage = socketPageMap.get(socket.id);
            if (prevPage) {
                socket.leave(`page:${prevPage}:user:${userId}`);
                socket.leave(`page:${prevPage}`);
            }
            socket.join(`page:${page}:user:${userId}`);
            socket.join(`page:${page}`);
            socketPageMap.set(socket.id, page);
        });

        // ── page:leave ──────────────────────────────────────────────────────────
        socket.on('page:leave', () => {
            const prevPage = socketPageMap.get(socket.id);
            if (prevPage) {
                socket.leave(`page:${prevPage}:user:${userId}`);
                socket.leave(`page:${prevPage}`);
                socketPageMap.delete(socket.id);
            }
        });

        // ── match:confirm-ready ─────────────────────────────────────────────────
        // Fired when a user clicks "Let's Go" on the MatchFoundModal.
        // Once BOTH users for a match have confirmed, emit match:session-start.
        socket.on('match:confirm-ready', async ({ matchId }) => {
            if (!matchId) return;

            try {
                // Verify user is part of this match
                const match = await prisma.match.findUnique({ where: { id: matchId } });
                if (!match) return;
                if (match.requesterId !== userId && match.receiverId !== userId) return;
                if (match.status !== 'ACCEPTED') return;

                // Track readiness
                if (!readyMap.has(matchId)) readyMap.set(matchId, new Set());
                readyMap.get(matchId).add(userId);

                const ready = readyMap.get(matchId);
                const bothReady = ready.has(match.requesterId) && ready.has(match.receiverId);

                if (bothReady) {
                    readyMap.delete(matchId);

                    // Update match status to CONFIRMED
                    const sessionId = match.sessionId || `session_${matchId}_${Date.now()}`;
                    await prisma.match.update({
                        where: { id: matchId },
                        data: { status: 'CONFIRMED', sessionId },
                    });

                    // Join both users to the session socket room
                    // Find all sockets for each user and join them
                    const requesterSockets = await io.in(`user:${match.requesterId}`).fetchSockets();
                    const receiverSockets = await io.in(`user:${match.receiverId}`).fetchSockets();
                    for (const s of [...requesterSockets, ...receiverSockets]) {
                        s.join(sessionId);
                    }

                    // Emit session-start to both users
                    const payload = { matchId, sessionId, topic: match.topic };
                    emitToUser(io, match.requesterId, 'match:session-start', payload);
                    emitToUser(io, match.receiverId, 'match:session-start', payload);

                    console.log(`[Match] Both users confirmed match ${matchId} → session ${sessionId}`);
                } else {
                    console.log(`[Match] User ${userId} confirmed match ${matchId}, waiting for partner`);
                }
            } catch (err) {
                console.error('[Match] confirm-ready error:', err.message);
            }
        });

        // ── match:join-session ──────────────────────────────────────────────────
        // Fired when user navigates to /session with an existing sessionId.
        // Joins the user's socket to the session room.
        socket.on('match:join-session', async ({ sessionId }) => {
            if (!sessionId) return;

            try {
                // Verify this user is part of the match that owns this session
                const match = await prisma.match.findFirst({
                    where: { sessionId, OR: [{ requesterId: userId }, { receiverId: userId }] },
                });
                if (!match) {
                    socket.emit('session-error', { message: 'Session not found or access denied' });
                    return;
                }

                socket.join(sessionId);
                setSocketRoom(socket.id, sessionId);

                // Update match to IN_SESSION if not already
                if (match.status === 'CONFIRMED' || match.status === 'ACCEPTED') {
                    await prisma.match.update({
                        where: { id: match.id },
                        data: { status: 'IN_SESSION' },
                    });
                }

                // Determine partner and find their socketId
                const partnerId = match.requesterId === userId ? match.receiverId : match.requesterId;
                const partner = await prisma.user.findUnique({
                    where: { id: partnerId },
                    select: { id: true, username: true, firstName: true, pfpSource: true },
                });

                // Look up partner's socket (already in session room)
                let partnerSocketId = null;
                let partnerInternalSocketId = null;
                try {
                    const sessionSockets = await io.in(sessionId).fetchSockets();
                    const partnerSocket = sessionSockets.find(s => s.dbUserId === partnerId);
                    if (partnerSocket) {
                        partnerSocketId = partnerSocket.id;
                        partnerInternalSocketId = partnerSocket.id;
                    }
                } catch { /* partner may not be connected yet */ }

                socket.emit('session-joined', {
                    sessionId,
                    matchId: match.id,
                    topic: match.topic,
                    partner: partner ? { userId: partner.id, socketId: partnerSocketId, username: partner.username, firstName: partner.firstName, pfpSource: partner.pfpSource } : null,
                    isInitiator: match.requesterId === userId,
                });

                // Notify the other user that their partner has joined
                socket.to(sessionId).emit('partner-joined', { userId, socketId: socket.id });

                // ── START SESSION TIMER when both users are now in the room ──────
                // We start the timer the moment the second user joins.
                // initSessionForRoom is idempotent — safe to call from either user.
                const sessionSockets = await io.in(sessionId).fetchSockets();
                const userIdsInRoom = [...new Set(sessionSockets.map(s => s.dbUserId).filter(Boolean))];
                console.log(`[Match] Unique users in room ${sessionId}:`, userIdsInRoom);

                if (userIdsInRoom.length >= 2) {
                    const [uid1, uid2] = userIdsInRoom;
                    const sid1 = sessionSockets.find(s => s.dbUserId === uid1)?.id;
                    const sid2 = sessionSockets.find(s => s.dbUserId === uid2)?.id;
                    const started = initSessionForRoom(io, sessionId, uid1, sid1, uid2, sid2);
                    if (started) {
                        console.log(`[Match] ✅ Session timer STARTED for ${sessionId} (${uid1} vs ${uid2})`);
                    } else {
                        console.log(`[Match] Session ${sessionId} already has timer running`);
                    }
                } else {
                    console.log(`[Match] Only ${userIdsInRoom.length} user(s) in room — waiting for partner to join`);
                }

                console.log(`[Match] User ${userId} joined session ${sessionId}`);
            } catch (err) {
                console.error('[Match] join-session error:', err.message);
                socket.emit('session-error', { message: 'Failed to join session' });
            }
        });
    });
}

module.exports = { registerMatchHandlers, emitToUser };
