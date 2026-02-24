const leagueService      = require('./league.service');
const { success, error } = require('../../utils/response');

// GET /api/leagues/all
const getAllLeagues = async (req, res) => {
  try {
    const leagues = await leagueService.getAllLeagues();
    return success(res, leagues, 'Leagues fetched');
  } catch (err) {
    return error(res, 'Failed to get leagues');
  }
};

// GET /api/leagues/user/:userId
const getUserLeague = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const league = await leagueService.getUserLeague(userId);
    return success(res, league, 'User league fetched');
  } catch (err) {
    return error(res, err.message || 'Failed to get user league', 404);
  }
};

// GET /api/leagues/:leagueId/members
const getLeagueMembers = async (req, res) => {
  try {
    const { leagueId }     = req.params;
    const { page = 0, limit = 20 } = req.query;
    const members          = await leagueService.getLeagueMembers(leagueId, parseInt(page), parseInt(limit));
    return success(res, members, 'League members fetched');
  } catch (err) {
    return error(res, err.message || 'Failed to get members', 404);
  }
};

// GET /api/leagues/standings
const getWeeklyStandings = async (req, res) => {
  try {
    const standings = await leagueService.getWeeklyStandings();
    return success(res, standings, 'Weekly standings fetched');
  } catch (err) {
    return error(res, 'Failed to get standings');
  }
};

module.exports = { getAllLeagues, getUserLeague, getLeagueMembers, getWeeklyStandings };
