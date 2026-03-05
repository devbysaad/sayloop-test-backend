const profilesService = require('./profile.service');
const { success, error } = require('../../utils/response');

// GET /api/profiles/search
const searchPartners = async (req, res) => {
  try {
    const { topic, page, limit } = req.query;
    // Always use req.dbUserId from auth middleware — never trust client-supplied userId
    const data = await profilesService.searchPartners({
      topic,
      userId: req.dbUserId,
      page:   Number(page  ?? 0),
      limit:  Number(limit ?? 10),
    });
    return success(res, data, 'Partners fetched');
  } catch (err) {
    console.error('[searchPartners]', err?.message ?? err);
    return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Failed to search partners' });
  }
};

// GET /api/profiles/:userId/stats
const getProfileStats = async (req, res) => {
  try {
    const data = await profilesService.getProfileStats(Number(req.params.userId));
    return success(res, data, 'Profile stats fetched');
  } catch (err) {
    console.error('[getProfileStats]', err?.message ?? err);
    return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Failed to get profile stats' });
  }
};

// GET /api/profiles/:userId
const getPublicProfile = async (req, res) => {
  try {
    const data = await profilesService.getPublicProfile(Number(req.params.userId));
    return success(res, data, 'Public profile fetched');
  } catch (err) {
    console.error('[getPublicProfile]', err?.message ?? err);
    return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Failed to get profile' });
  }
};

module.exports = { searchPartners, getProfileStats, getPublicProfile };