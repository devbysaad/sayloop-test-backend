const friendService      = require('./friend.service');
const { success, error } = require('../../utils/response');

// POST /api/friends/request/:userId  (follow)
const followUser = async (req, res) => {
  try {
    const followerId = req.user.dbId;
    const followedId = parseInt(req.params.userId);
    const result     = await friendService.followUser(followerId, followedId);
    return success(res, result, 'Now following user', 201);
  } catch (err) {
    return error(res, err.message || 'Failed to follow user', 400);
  }
};

// DELETE /api/friends/remove/:userId  (unfollow)
const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.dbId;
    const followedId = parseInt(req.params.userId);
    await friendService.unfollowUser(followerId, followedId);
    return success(res, null, 'Unfollowed user');
  } catch (err) {
    return error(res, err.message || 'Failed to unfollow user', 400);
  }
};

// GET /api/friends/list  (who you follow)
const getFollowing = async (req, res) => {
  try {
    const userId  = req.user.dbId;
    const friends = await friendService.getFollowing(userId);
    return success(res, friends, 'Following list fetched');
  } catch (err) {
    return error(res, 'Failed to get following list');
  }
};

// GET /api/friends/followers
const getFollowers = async (req, res) => {
  try {
    const userId    = req.user.dbId;
    const followers = await friendService.getFollowers(userId);
    return success(res, followers, 'Followers fetched');
  } catch (err) {
    return error(res, 'Failed to get followers');
  }
};

// GET /api/friends/leaderboard
const getFriendsLeaderboard = async (req, res) => {
  try {
    const userId      = req.user.dbId;
    const leaderboard = await friendService.getFriendsLeaderboard(userId);
    return success(res, leaderboard, 'Friends leaderboard fetched');
  } catch (err) {
    return error(res, 'Failed to get friends leaderboard');
  }
};

module.exports = { followUser, unfollowUser, getFollowing, getFollowers, getFriendsLeaderboard };
