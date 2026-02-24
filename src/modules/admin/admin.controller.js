const adminService       = require('./admin.service');
const { success, error } = require('../../utils/response');

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { page = 0, limit = 20 } = req.query;
    const users = await adminService.getAllUsers(parseInt(page), parseInt(limit));
    return success(res, users, 'Users fetched');
  } catch (err) {
    return error(res, 'Failed to get users');
  }
};

// GET /api/admin/stats
const getSystemStats = async (req, res) => {
  try {
    const stats = await adminService.getSystemStats();
    return success(res, stats, 'Stats fetched');
  } catch (err) {
    return error(res, 'Failed to get stats');
  }
};

// POST /api/admin/reset/:userId
const resetUserPoints = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await adminService.resetUserPoints(userId);
    return success(res, result, 'User reset');
  } catch (err) {
    return error(res, 'Failed to reset user', 400);
  }
};

module.exports = { getAllUsers, getSystemStats, resetUserPoints };
