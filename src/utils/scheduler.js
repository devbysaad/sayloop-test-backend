const cron = require('node-cron');

const startScheduler = () => {
  // Reset weekly leaderboard every Monday at midnight
  cron.schedule('0 0 * * 1', async () => {
    console.log('Running weekly leaderboard reset...');
  });

  // Refresh daily quests every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily quest refresh...');
  });

  // Check streaks every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running streak check...');
  });

  console.log('✓ Scheduler started');
};

module.exports = { startScheduler };
