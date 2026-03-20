/**
 * SayLoop — Level Utilities
 * Defines XP thresholds and titles for each level.
 * Level only ever increases — never drops even if XP drops.
 */

const LEVELS = [
  { level: 1,  minXP: 0,     title: 'Newbie' },
  { level: 2,  minXP: 100,   title: 'Beginner' },
  { level: 3,  minXP: 300,   title: 'Speaker' },
  { level: 4,  minXP: 600,   title: 'Talker' },
  { level: 5,  minXP: 1000,  title: 'Debater' },
  { level: 6,  minXP: 1800,  title: 'Orator' },
  { level: 7,  minXP: 3000,  title: 'Influencer' },
  { level: 8,  minXP: 5000,  title: 'Champion' },
  { level: 9,  minXP: 8000,  title: 'Legend' },
  { level: 10, minXP: 12000, title: 'Grandmaster' },
];

/**
 * Gem bonuses awarded on level up (only certain levels get gems).
 * Key = level number, value = gems awarded.
 */
const LEVEL_UP_GEMS = {
  5: 3,
  10: 10,
};

/**
 * Determine level from total XP.
 * Returns the highest level tier the user qualifies for.
 * @param {number} xp
 * @returns {number} level (1-10)
 */
function getLevelForXP(xp) {
  let level = 1;
  for (const tier of LEVELS) {
    if (xp >= tier.minXP) level = tier.level;
  }
  return level;
}

/**
 * Get the display title for a level number.
 * @param {number} level
 * @returns {string}
 */
function getTitleForLevel(level) {
  const tier = LEVELS.find((l) => l.level === level);
  return tier ? tier.title : 'Newbie';
}

/**
 * Get XP needed to reach the next level from current total XP.
 * Returns null if already at max level.
 * @param {number} xp
 * @returns {{ nextLevelXP: number, progress: number, currentLevelXP: number } | null}
 */
function getProgressToNextLevel(xp) {
  const currentLevel = getLevelForXP(xp);
  const nextTier = LEVELS.find((l) => l.level === currentLevel + 1);
  if (!nextTier) return null; // Max level

  const currentTier = LEVELS.find((l) => l.level === currentLevel);
  const currentLevelXP = currentTier ? currentTier.minXP : 0;
  const nextLevelXP = nextTier.minXP;
  const progress = Math.min(1, (xp - currentLevelXP) / (nextLevelXP - currentLevelXP));

  return { nextLevelXP, currentLevelXP, progress };
}

module.exports = { LEVELS, LEVEL_UP_GEMS, getLevelForXP, getTitleForLevel, getProgressToNextLevel };
