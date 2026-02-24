const userService = require('./user.service');
const { success, error } = require('../../utils/response');

// POST /api/users/sync  — called from frontend after Clerk login
const syncUser = async (req, res) => {
  try {
    const { clerkId: bodyClerkId, email, firstName, lastName, pfpSource } = req.body;
    const clerkId = req.auth?.userId || bodyClerkId;

    if (!clerkId) {
      return error(res, 'clerkId is required for sync', 400);
    }

    const user = await userService.syncUser(clerkId, { email, firstName, lastName, pfpSource });
    return success(res, user, 'User synced successfully', 201);
  } catch (err) {
    console.error('Error in syncUser:', (err instanceof Error) ? err.message : err);
    return error(res, 'Failed to sync user');
  }
};

// GET /api/users/me
const getMe = async (req, res) => {
  try {
    const user = await userService.getMyProfile(req.dbUserId);
    return success(res, user, 'Profile fetched');
  } catch (err) {
    return error(res, 'Failed to get profile');
  }
};

// PUT /api/users/me
const updateMe = async (req, res) => {
  try {
    const { username, firstName, lastName, pfpSource } = req.body;
    const user = await userService.updateProfile(req.dbUserId, { username, firstName, lastName, pfpSource });
    return success(res, user, 'Profile updated');
  } catch (err) {
    console.error('Error in updateMe:', err);
    return error(res, err.message || 'Failed to update profile', 400);
  }
};

// GET /api/users/me/stats
const getMyStats = async (req, res) => {
  try {
    const stats = await userService.getUserStats(req.dbUserId);
    return success(res, stats, 'Stats fetched');
  } catch (err) {
    return error(res, 'Failed to get stats');
  }
};

module.exports = { syncUser, getMe, updateMe, getMyStats };
