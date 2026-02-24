const heartService       = require('./heart.service');
const { success, error } = require('../../utils/response');

// GET /api/hearts/:userId/status
const getHeartStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const status = await heartService.getHeartStatus(userId);
    return success(res, status, 'Heart status fetched');
  } catch (err) {
    return error(res, 'Failed to get heart status');
  }
};

// POST /api/hearts/:userId/use
const useHeart = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const result = await heartService.useHeart(userId);
    return success(res, result, 'Heart used');
  } catch (err) {
    return error(res, err.message || 'Failed to use heart', 400);
  }
};

// POST /api/hearts/:userId/refill
const refillHearts = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const result = await heartService.refillHearts(userId);
    return success(res, result, 'Hearts refilled');
  } catch (err) {
    return error(res, err.message || 'Failed to refill hearts', 400);
  }
};

module.exports = { getHeartStatus, useHeart, refillHearts };
