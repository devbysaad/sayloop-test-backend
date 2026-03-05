const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const prisma = require('../config/database');

// FIX: Pass secretKey explicitly. Without it, some versions of the Clerk SDK
// do NOT automatically read CLERK_SECRET_KEY from process.env when called
// as ClerkExpressWithAuth() — req.auth.userId silently comes back null.
const clerkAuth = ClerkExpressWithAuth({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const clerkAuthWithDebug = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const hasToken = !!(authHeader && authHeader.startsWith('Bearer '));
  const secretKeyPrefix = process.env.CLERK_SECRET_KEY
    ? process.env.CLERK_SECRET_KEY.substring(0, 12) + '...'
    : '(NOT SET)';

  console.log('[auth-debug] ─────────────────────────────────────────');
  console.log('[auth-debug] Path:', req.method, req.originalUrl);
  console.log('[auth-debug] Authorization header present:', hasToken);
  if (hasToken) {
    const token = authHeader.split(' ')[1];
    console.log('[auth-debug] Token length:', token.length);
    console.log('[auth-debug] Token preview:', token.substring(0, 20) + '...');
  }
  console.log('[auth-debug] CLERK_SECRET_KEY prefix:', secretKeyPrefix);

  clerkAuth(req, res, (err) => {
    if (err) {
      console.error('[auth-debug] ClerkExpressWithAuth ERROR:', err.message || err);
      return next(err);
    }
    console.log('[auth-debug] req.auth after Clerk:', JSON.stringify(req.auth, null, 2));
    console.log('[auth-debug] req.auth.userId:', req.auth?.userId ?? '(null/undefined)');
    console.log('[auth-debug] ─────────────────────────────────────────');
    next();
  });
};

const resolveDbUser = async (req, res, next) => {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      console.warn('[resolveDbUser] No clerkId in req.auth — token may be invalid or expired');
      return res.status(401).json({ success: false, message: 'Unauthorized — no valid Clerk session' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not synced. Call POST /api/users/sync first.',
      });
    }

    req.dbUserId = user.id;
    next();
  } catch (err) {
    console.error('[resolveDbUser] Auth resolution failed:', err);
    return res.status(500).json({ success: false, message: 'Auth resolution failed' });
  }
};

const protect = [clerkAuthWithDebug, resolveDbUser];
const requireAuth = protect;

const adminOnly = (req, res, _next) => {
  return res.status(501).json({
    success: false,
    message: 'Admin role not yet implemented',
  });
};

module.exports = { clerkAuth: clerkAuthWithDebug, resolveDbUser, protect, requireAuth, adminOnly };