const api = '/api';

// Base paths
const USERS = `${api}/users`;
const MATCHES = `${api}/matches`;
const SESSIONS = `${api}/sessions`;
const LEADERBOARD = `${api}/leaderboard`;
const LEVELS = `${api}/levels`;
const HEARTS = `${api}/hearts`;
const NOTIFICATIONS = `${api}/notifications`;
const PROFILES = `${api}/profiles`;

const paths = {
  USERS, MATCHES,
  SESSIONS, LEADERBOARD, LEVELS, HEARTS,
  NOTIFICATIONS, PROFILES,

  // User endpoints
  SYNC_USER: '/sync',
  GET_ME: '/me',
  UPDATE_ME: '/me',
  DELETE_ME: '/me',
  GET_MY_STATS: '/me/stats',




  // Match endpoints
  FIND_MATCH: '/find',
  GET_MATCH_BY_ID: '/:matchId',
  ACCEPT_MATCH: '/:matchId/accept',
  REJECT_MATCH: '/:matchId/reject',
  GET_ACTIVE_MATCHES: '/active',
  GET_MATCH_HISTORY: '/history',

  // Session endpoints
  CREATE_SESSION: '/create',
  GET_SESSION_BY_ID: '/:sessionId',
  JOIN_SESSION: '/:sessionId/join',
  LEAVE_SESSION: '/:sessionId/leave',
  END_SESSION: '/:sessionId/end',
  GET_SESSION_STATUS: '/:sessionId/status',

  // Leaderboard endpoints
  GET_PAGINATED_LEADERBOARD: '/paginated',
  GET_TOP_LEADERBOARD: '/top',
  GET_USER_RANK: '/rank/:userId',
  GET_LEAGUE_LEADERBOARD: '/league/:leagueId',

  // Heart endpoints
  GET_HEARTS: '/:userId',
  USE_HEART: '/:userId/use',
  REFILL_HEARTS: '/:userId/refill',
  GET_HEART_STATUS: '/:userId/status',


  // Notification endpoints
  GET_NOTIFICATIONS: '/:userId',
  MARK_AS_READ: '/:notifId/read',
  MARK_ALL_READ: '/read-all',
  DELETE_NOTIFICATION: '/:notifId',
  GET_UNREAD_COUNT: '/:userId/unread-count',

  // Profile endpoints
  GET_PUBLIC_PROFILE: '/:userId',
  UPDATE_AVATAR: '/avatar',
  UPDATE_BIO: '/bio',
  GET_PROFILE_STATS: '/:userId/stats',
  SEARCH_PROFILES: '/search',


};

module.exports = paths;
