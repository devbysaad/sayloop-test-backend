const isStreakActive = (lastSubmission) => {
  if (!lastSubmission) return false;
  const diffHours = (new Date() - new Date(lastSubmission)) / (1000 * 60 * 60);
  return diffHours < 48;
};

const shouldIncrementStreak = (lastSubmission) => {
  if (!lastSubmission) return true;
  const diffHours = (new Date() - new Date(lastSubmission)) / (1000 * 60 * 60);
  return diffHours >= 24 && diffHours < 48;
};

module.exports = { isStreakActive, shouldIncrementStreak };
