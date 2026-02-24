const prisma = require('../../config/database');

// Follow a user (Duolingo uses follow, not friend request)
const followUser = async (followerId, followedId) => {
  if (followerId === followedId) throw new Error('You cannot follow yourself');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followedId: { followerId, followedId } },
  });
  if (existing) throw new Error('Already following this user');

  return prisma.follow.create({ data: { followerId, followedId } });
};

// Unfollow a user
const unfollowUser = async (followerId, followedId) => {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followedId: { followerId, followedId } },
  });
  if (!existing) throw new Error('Not following this user');

  return prisma.follow.delete({
    where: { followerId_followedId: { followerId, followedId } },
  });
};

// Get list of users you follow
const getFollowing = async (userId) => {
  const follows = await prisma.follow.findMany({
    where:   { followerId: userId },
    include: {
      followed: {
        select: { id: true, username: true, firstName: true, lastName: true, pfpSource: true, points: true, streakLength: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return follows.map((f) => f.followed);
};

// Get list of users who follow you
const getFollowers = async (userId) => {
  const follows = await prisma.follow.findMany({
    where:   { followedId: userId },
    include: {
      follower: {
        select: { id: true, username: true, firstName: true, lastName: true, pfpSource: true, points: true, streakLength: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return follows.map((f) => f.follower);
};

// Get friends leaderboard (people you follow, ranked by points)
const getFriendsLeaderboard = async (userId) => {
  const following = await getFollowing(userId);
  const me        = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, username: true, firstName: true, lastName: true, pfpSource: true, points: true, streakLength: true },
  });

  const all = [me, ...following].sort((a, b) => b.points - a.points);
  return all.map((u, i) => ({ rank: i + 1, ...u, isMe: u.id === userId }));
};

module.exports = { followUser, unfollowUser, getFollowing, getFollowers, getFriendsLeaderboard };
