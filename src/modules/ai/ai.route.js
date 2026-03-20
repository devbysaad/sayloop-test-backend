/**
 * AI route — name suggestions + topics listing
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth.middleware');
const { generateNameSuggestions } = require('./nameService');
const { topics } = require('../../config/topics');

/**
 * POST /api/ai/name-suggestions
 * Body: { name: string }
 * Returns: { suggestions: string[] }
 */
router.post('/name-suggestions', requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  if (name.trim().length > 50) {
    return res.status(400).json({ success: false, message: 'Name too long' });
  }

  try {
    const suggestions = await generateNameSuggestions(name.trim());
    return res.json({ success: true, suggestions });
  } catch (err) {
    console.error('[AI Route] name-suggestions error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate suggestions' });
  }
});

/**
 * GET /api/ai/topics
 * Public — returns all structured topics
 */
router.get('/topics', (req, res) => {
  res.json({ success: true, topics });
});

module.exports = router;
