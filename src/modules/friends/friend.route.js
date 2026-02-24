const express           = require('express');
const router            = express.Router();
const friendController  = require('./friend.controller');
const { protect }       = require('../../middleware/auth.middleware');
const paths             = require('../../config/constants');

router.use(protect);

router.get('/leaderboard',               friendController.getFriendsLeaderboard);
router.get('/followers',                 friendController.getFollowers);
router.get(paths.GET_FRIENDS,            friendController.getFollowing);
router.post(paths.SEND_FRIEND_REQUEST,   friendController.followUser);
router.delete(paths.REMOVE_FRIEND,       friendController.unfollowUser);

module.exports = router;
