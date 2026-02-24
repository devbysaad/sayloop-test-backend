const profilesService = require('./profile.service');

// ─── GET /api/profiles/search ─────────────────────────────────────────────────
const searchPartners = async (req, res) => {
    try {
        const { topic, page, limit } = req.query;
        // BUG FIXED: was trusting client-supplied userId query param.
        // Use req.dbUserId from auth middleware instead.
        const data = await profilesService.searchPartners({
            topic,
            userId: req.dbUserId,
            page: Number(page ?? 0),
            limit: Number(limit ?? 10),
        });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Failed to search partners' });
    }
};

// ─── GET /api/profiles/:userId/stats ─────────────────────────────────────────
const getProfileStats = async (req, res) => {
    try {
        const data = await profilesService.getProfileStats(Number(req.params.userId));
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Failed to get profile stats' });
    }
};

// ─── GET /api/profiles/:userId ────────────────────────────────────────────────
const getPublicProfile = async (req, res) => {
    try {
        const data = await profilesService.getPublicProfile(Number(req.params.userId));
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Failed to get profile' });
    }
};

module.exports = { searchPartners, getProfileStats, getPublicProfile };