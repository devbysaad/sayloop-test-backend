const express           = require('express');
const router            = express.Router();
const leagueController  = require('./league.controller');
const { protect }       = require('../../middleware/auth.middleware');
const paths             = require('../../config/constants');

router.use(protect);

router.get(paths.GET_ALL_LEAGUES,    leagueController.getAllLeagues);
router.get(paths.GET_WEEKLY_STANDINGS, leagueController.getWeeklyStandings);
router.get(paths.GET_USER_LEAGUE,    leagueController.getUserLeague);
router.get(paths.GET_LEAGUE_MEMBERS, leagueController.getLeagueMembers);

module.exports = router;
