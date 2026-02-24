const scoreDebate = ({ argumentStrength = 0, rebuttalQuality = 0, clarity = 0, relevance = 0 }) => {
  const total = (argumentStrength * 0.4) + (rebuttalQuality * 0.3) + (clarity * 0.2) + (relevance * 0.1);
  return Math.min(100, Math.round(total));
};
module.exports = { scoreDebate };
