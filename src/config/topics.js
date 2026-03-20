/**
 * topics.js — Structured conversation topics for SayLoop
 * Each topic has prompts (discussion starters) and tasks (speaking challenges)
 */

const topics = [
  {
    id: 'daily_life',
    title: 'Daily Life',
    emoji: '☀️',
    color: '#F59E0B',
    prompts: [
      'What did you do this morning?',
      'What is your daily routine like?',
      'What is your favorite part of the day?',
      'Do you prefer mornings or evenings? Why?',
      'What do you usually eat for breakfast?',
    ],
    tasks: [
      'Describe your typical day in 30 seconds',
      'Ask your partner 2 questions about their routine',
      'Share one habit you want to start or stop',
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    emoji: '✈️',
    color: '#3B82F6',
    prompts: [
      'Where did you travel last time?',
      'What is your dream destination?',
      'Do you prefer mountains or beaches?',
      'Would you rather travel alone or with friends?',
      'What is the best food you ever ate while traveling?',
    ],
    tasks: [
      'Describe your last trip in 30 seconds',
      'Ask your partner 2 questions about travel',
      'Give your opinion on solo travel — agree or disagree?',
    ],
  },
  {
    id: 'technology',
    title: 'Technology',
    emoji: '💻',
    color: '#6366F1',
    prompts: [
      'What app do you use most every day?',
      'Do you think AI will replace jobs?',
      'What technology do you wish existed?',
      'Are you addicted to your phone? Why?',
      'What is one thing technology ruined?',
    ],
    tasks: [
      'Explain what technology means to you in 30 seconds',
      'Ask your partner about their relationship with social media',
      'Agree or disagree: Technology makes us less social',
    ],
  },
  {
    id: 'food',
    title: 'Food & Cooking',
    emoji: '🍜',
    color: '#EF4444',
    prompts: [
      'What is your favorite food and why?',
      'Can you cook? What do you make?',
      'Have you ever tried a food from another country?',
      'What is the strangest thing you have ever eaten?',
      'Do you prefer home food or restaurant food?',
    ],
    tasks: [
      'Describe your favorite meal in 30 seconds',
      'Ask 2 questions about your partner\'s food culture',
      'Give your opinion: Is fast food really that bad?',
    ],
  },
  {
    id: 'sports',
    title: 'Sports & Fitness',
    emoji: '⚽',
    color: '#22C55E',
    prompts: [
      'Do you play any sport or exercise regularly?',
      'What sport would you try if you could?',
      'Who is your favorite athlete?',
      'Is it important to stay fit? Why?',
      'Team sports or individual sports — which do you prefer?',
    ],
    tasks: [
      'Talk about a sport you love or hate for 30 seconds',
      'Ask your partner 2 questions about their fitness habits',
      'Agree or disagree: Everyone should exercise at least 3 times a week',
    ],
  },
  {
    id: 'work_study',
    title: 'Work & Study',
    emoji: '📚',
    color: '#8B5CF6',
    prompts: [
      'What do you do for work or study?',
      'Do you enjoy what you study or work on?',
      'What is your dream job?',
      'Is it better to work for yourself or a company?',
      'What subject did you like most in school?',
    ],
    tasks: [
      'Describe your job or studies in 30 seconds',
      'Ask your partner 2 questions about their career goals',
      'Agree or disagree: Money is more important than passion in a career',
    ],
  },
  {
    id: 'entertainment',
    title: 'Movies & Music',
    emoji: '🎬',
    color: '#EC4899',
    prompts: [
      'What movie do you recommend and why?',
      'What type of music do you listen to?',
      'Do you prefer watching movies or reading books?',
      'Who is your favorite singer or band?',
      'What was the last movie that made you emotional?',
    ],
    tasks: [
      'Describe your favorite movie or show in 30 seconds',
      'Ask your partner 2 questions about their entertainment taste',
      'Give your opinion: Are modern movies worse than old ones?',
    ],
  },
  {
    id: 'future_goals',
    title: 'Future & Goals',
    emoji: '🎯',
    color: '#F97316',
    prompts: [
      'Where do you see yourself in 5 years?',
      'What is one goal you are working on right now?',
      'What is your biggest fear about the future?',
      'If you could change one thing about your life, what would it be?',
      'What does success mean to you?',
    ],
    tasks: [
      'Describe your most important goal in 30 seconds',
      'Ask your partner 2 questions about their dreams',
      'Agree or disagree: Achieving goals requires sacrifice',
    ],
  },
];

module.exports = { topics };
