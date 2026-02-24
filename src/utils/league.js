const LEAGUES = [
  { name: 'Bronze',   minXP: 0     },
  { name: 'Silver',   minXP: 100   },
  { name: 'Gold',     minXP: 250   },
  { name: 'Sapphire', minXP: 500   },
  { name: 'Ruby',     minXP: 1000  },
  { name: 'Emerald',  minXP: 2000  },
  { name: 'Amethyst', minXP: 3500  },
  { name: 'Pearl',    minXP: 5000  },
  { name: 'Obsidian', minXP: 7500  },
  { name: 'Diamond',  minXP: 10000 },
];

const getLeagueByXP = (xp) => {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (xp >= LEAGUES[i].minXP) return LEAGUES[i];
  }
  return LEAGUES[0];
};

module.exports = { LEAGUES, getLeagueByXP };
