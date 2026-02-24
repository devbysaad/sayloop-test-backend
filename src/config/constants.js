const api = '/api';

// Base paths
const USERS         = `${api}/users`;
const COURSES       = `${api}/courses`;
const LESSONS       = `${api}/lessons`;
const EXERCISES     = `${api}/exercises`;
const DEBATES       = `${api}/debates`;
const MATCHES       = `${api}/matches`;
const SESSIONS      = `${api}/sessions`;
const LEADERBOARD   = `${api}/leaderboard`;
const QUESTS        = `${api}/quests`;
const PROGRESS      = `${api}/progress`;
const LEVELS        = `${api}/levels`;
const HEARTS        = `${api}/hearts`;
const GEMS          = `${api}/gems`;
const STREAKS       = `${api}/streaks`;
const LEAGUES       = `${api}/leagues`;
const NOTIFICATIONS = `${api}/notifications`;
const PROFILES      = `${api}/profiles`;
const FRIENDS       = `${api}/friends`;
const SHOP          = `${api}/shop`;
const AI            = `${api}/ai`;
const ADMIN         = `${api}/admin`;

const paths = {
  USERS, COURSES, LESSONS, EXERCISES, DEBATES, MATCHES,
  SESSIONS, LEADERBOARD, QUESTS, PROGRESS, LEVELS, HEARTS,
  GEMS, STREAKS, LEAGUES, NOTIFICATIONS, PROFILES, FRIENDS,
  SHOP, AI, ADMIN,

  // User endpoints
  SYNC_USER:       '/sync',
  GET_ME:          '/me',
  UPDATE_ME:       '/me',
  DELETE_ME:       '/me',
  GET_MY_STATS:    '/me/stats',

  // Course endpoints
  GET_ALL_COURSES:          '/all',
  GET_USER_COURSE:          '/get/:userId',
  CHANGE_COURSE:            '/change',
  GET_SECTIONS_BY_COURSE:   '/:courseId/sections',
  GET_SECTION_IDS_BY_COURSE:'/:courseId/sections/ids',

  // Lesson endpoints
  GET_LESSONS_BY_SECTION: '/:sectionId/lessons',
  GET_LESSON_BY_ID:       '/lesson/:lessonId',
  START_LESSON:           '/lesson/:lessonId/start',
  COMPLETE_LESSON:        '/lesson/:lessonId/complete',

  // Exercise endpoints
  GET_EXERCISES_BY_LESSON: '/:lessonId/exercises',
  SUBMIT_ANSWER:           '/exercise/:exerciseId/submit',
  GET_EXERCISE_RESULT:     '/exercise/:exerciseId/result',

  // Debate endpoints
  CREATE_DEBATE:        '/create',
  GET_DEBATE_BY_ID:     '/:debateId',
  GET_ALL_DEBATES:      '/all',
  SUBMIT_DEBATE_RESULT: '/:debateId/submit',
  END_DEBATE:           '/:debateId/end',
  GET_DEBATE_HISTORY:   '/history/:userId',

  // Match endpoints
  FIND_MATCH:        '/find',
  GET_MATCH_BY_ID:   '/:matchId',
  ACCEPT_MATCH:      '/:matchId/accept',
  REJECT_MATCH:      '/:matchId/reject',
  GET_ACTIVE_MATCHES:'/active',
  GET_MATCH_HISTORY: '/history',

  // Session endpoints
  CREATE_SESSION:    '/create',
  GET_SESSION_BY_ID: '/:sessionId',
  JOIN_SESSION:      '/:sessionId/join',
  LEAVE_SESSION:     '/:sessionId/leave',
  END_SESSION:       '/:sessionId/end',
  GET_SESSION_STATUS:'/:sessionId/status',

  // Leaderboard endpoints
  GET_PAGINATED_LEADERBOARD: '/paginated',
  GET_TOP_LEADERBOARD:       '/top',
  GET_USER_RANK:             '/rank/:userId',
  GET_LEAGUE_LEADERBOARD:    '/league/:leagueId',

  // Quest endpoints
  GET_QUESTS_BY_USER:  '/get',
  GET_MONTHLY_CHALLENGE:'/monthly',
  GET_DAILY_QUESTS:    '/daily',
  COMPLETE_QUEST:      '/:questId/complete',
  CLAIM_QUEST_REWARD:  '/:questId/claim',

  // Progress endpoints
  GET_USER_PROGRESS: '/:userId',
  GET_LEVEL_PROGRESS:'/:userId/level',
  GET_STREAK_INFO:   '/:userId/streak',
  UPDATE_STREAK:     '/:userId/streak',
  GET_XP_HISTORY:    '/:userId/xp-history',

  // Level endpoints
  GET_ALL_LEVELS:  '/all',
  GET_LEVEL_BY_ID: '/:levelId',
  GET_USER_LEVELS: '/user/:userId',
  UNLOCK_LEVEL:    '/:levelId/unlock',
  GET_LEVEL_STATUS:'/:levelId/status',

  // Heart endpoints
  GET_HEARTS:      '/:userId',
  USE_HEART:       '/:userId/use',
  REFILL_HEARTS:   '/:userId/refill',
  GET_HEART_STATUS:'/:userId/status',

  // Gem endpoints
  GET_GEMS:      '/:userId',
  ADD_GEMS:      '/:userId/add',
  SPEND_GEMS:    '/:userId/spend',
  GET_GEM_HISTORY:'/:userId/history',

  // Streak endpoints
  GET_STREAK:           '/:userId',
  UPDATE_STREAK_ROUTE:  '/:userId/update',
  FREEZE_STREAK:        '/:userId/freeze',
  REPAIR_STREAK:        '/:userId/repair',
  GET_STREAK_HISTORY:   '/:userId/history',

  // League endpoints
  GET_ALL_LEAGUES:    '/all',
  GET_USER_LEAGUE:    '/user/:userId',
  GET_LEAGUE_MEMBERS: '/:leagueId/members',
  PROMOTE_USER:       '/:userId/promote',
  DEMOTE_USER:        '/:userId/demote',
  GET_WEEKLY_STANDINGS:'/standings',

  // Notification endpoints
  GET_NOTIFICATIONS:  '/:userId',
  MARK_AS_READ:       '/:notifId/read',
  MARK_ALL_READ:      '/read-all',
  DELETE_NOTIFICATION:'/:notifId',
  GET_UNREAD_COUNT:   '/:userId/unread-count',

  // Profile endpoints
  GET_PUBLIC_PROFILE: '/:userId',
  UPDATE_AVATAR:      '/avatar',
  UPDATE_BIO:         '/bio',
  GET_PROFILE_STATS:  '/:userId/stats',
  SEARCH_PROFILES:    '/search',

  // Friend endpoints
  SEND_FRIEND_REQUEST:  '/request/:userId',
  ACCEPT_FRIEND_REQUEST:'/accept/:userId',
  REJECT_FRIEND_REQUEST:'/reject/:userId',
  REMOVE_FRIEND:        '/remove/:userId',
  GET_FRIENDS:          '/list',
  GET_PENDING_REQUESTS: '/pending',

  // Shop endpoints
  GET_SHOP_ITEMS: '/items',
  PURCHASE_ITEM:  '/purchase/:itemId',
  GET_INVENTORY:  '/inventory/:userId',
  USE_ITEM:       '/use/:itemId',

  // AI endpoints
  SCORE_DEBATE:           '/score-debate',
  GENERATE_FEEDBACK:      '/feedback',
  EVALUATE_PRONUNCIATION: '/pronunciation',
  GET_DEBATE_SUGGESTIONS: '/suggestions',

  // Admin endpoints
  GET_ALL_USERS_ADMIN: '/users',
  BAN_USER:            '/ban/:userId',
  UNBAN_USER:          '/unban/:userId',
  GET_SYSTEM_STATS:    '/stats',
  MANAGE_CONTENT:      '/content/:id',
  RESET_LEADERBOARD:   '/leaderboard/reset',
};

module.exports = paths;
