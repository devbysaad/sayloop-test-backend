/**
 * SayLoop — Session Configuration
 * Central source of truth for all session timing & anti-abuse limits.
 * Change these values here only — never hardcode in socket handlers.
 */

module.exports = {
  /** Total session length in seconds (5 minutes) */
  SESSION_DURATION: 300,

  /** Max consecutive seconds mic can be OFF before auto-resign begins */
  MIC_OFF_LIMIT: 45,

  /** Final countdown (seconds) shown to user before they are auto-resigned */
  WARNING_BEFORE_RESIGN: 10,

  /** Minimum session duration (seconds) to qualify for ANY XP */
  MIN_SESSION_FOR_XP: 60,

  /** Minimum speaking time (seconds) to qualify for speaking XP */
  MIN_SPEAKING_FOR_XP: 10,

  /** Minimum speaking time (seconds) to earn the speaking XP bonus */
  SPEAKING_BONUS_THRESHOLD: 60,
};
