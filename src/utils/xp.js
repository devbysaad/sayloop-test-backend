const XP_VALUES = {
  EXERCISE_CORRECT:   5,
  LESSON_COMPLETE:    10,
  LESSON_PERFECT:     20,
  DEBATE_WIN:         30,
  DEBATE_PARTICIPATE: 10,
  STREAK_BONUS:       5,
  DAILY_QUEST:        10,
};

const calculateLessonXP = (score) => score === 100 ? XP_VALUES.LESSON_PERFECT : XP_VALUES.LESSON_COMPLETE;
const calculateDebateXP = (won) => won ? XP_VALUES.DEBATE_WIN : XP_VALUES.DEBATE_PARTICIPATE;

module.exports = { XP_VALUES, calculateLessonXP, calculateDebateXP };
