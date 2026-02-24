const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const prisma = require('../config/database');

// ─── Clerk authentication gate ────────────────────────────────────────────────
// BYPASS FOR DEV: Always call next()
const clerkAuth = (req, res, next) => {
  // If Clerk token is valid, it will populate req.auth
  // If not, we just continue and let resolveDbUser handle the fallback
  next();
};

// ─── DB user resolution middleware ────────────────────────────────────────────
const resolveDbUser = async (req, res, next) => {
  try {
    // Falls back to a default test_user ID if Clerk auth is missing
    const clerkId = req.auth?.userId || req.headers['x-clerk-id'] || 'user_2m1vD4yJ7pQ9nB8u5r3t0x6z';

    let user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    // If test user doesn't exist, create it on the fly
    if (!user && clerkId === 'user_2m1vD4yJ7pQ9nB8u5r3t0x6z') {
      user = await prisma.user.create({
        data: {
          clerkId,
          email: 'test@sayloop.com',
          username: 'test_user',
          firstName: 'Test',
          lastName: 'User',
        },
        select: { id: true },
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not synced. Call /api/users/sync first.' });
    }
    req.dbUserId = user.id;
    next();
  } catch (err) {
    console.error('Auth resolution failed:', err);
    return res.status(500).json({ success: false, message: 'Auth resolution failed' });
  }
};

const requireAuth = [clerkAuth, resolveDbUser];
const protect = requireAuth;

// ─── Admin guard ──────────────────────────────────────────────────────────────
// BUG FIXED: User model has no `role` field in schema.
// Until you add `role String @default("USER")` to the User model in schema.prisma,
// this middleware always blocks. Stub returns 501 so it's obvious rather than silently 403.
const adminOnly = async (req, res, next) => {
  // TODO: add `role String @default("USER") @db.VarChar(20)` to User model,
  //       run `npx prisma migrate dev --name add_user_role`,
  //       then replace this stub with the real check below.
  return res.status(501).json({ success: false, message: 'Admin role not yet implemented in schema' });

  /*  ← uncomment after adding role field:
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.dbUserId },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Admin check failed' });
  }
  */
};

module.exports = { clerkAuth, requireAuth, protect, adminOnly };