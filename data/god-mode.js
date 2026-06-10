/* ============================================================
   God Mode — scenario cards for the God Mode dialog.
   Scenarios unlock sequentially: scenario N is only available
   once scenario N-1 has been activated.

   actionLabel: button text when the card is available.
   description: shown when unlocked; locked cards show CLASSIFIED.
   ============================================================ */
const GOD_MODE_SCENARIOS = [
  {
    id: 1,
    name: "Genesis",
    emoji: "🌍",
    description: "In the beginning, there were votes. Initialise the results and let the data flow.",
    actionLabel: "Initialise",
  },
  {
    id: 2,
    name: "Top Secret 1",
    emoji: "📁",
    description: "LEVEL 1 CLEARANCE. Early precincts come in hot. The leaderboard is about to shift.",
    actionLabel: "Execute",
  },
  {
    id: 3,
    name: "Top Secret 2",
    emoji: "📁",
    description: "LEVEL 2 CLEARANCE. Do not discuss in the break room. The 502nd has started counting.",
    actionLabel: "Execute",
  },
  {
    id: 4,
    name: "Top Secret 3",
    emoji: "📁",
    description: "LEVEL 3 CLEARANCE. The donuts are not what they seem. A projection is imminent.",
    actionLabel: "Execute",
  },
  {
    id: 5,
    name: "Top Secret 4",
    emoji: "📁",
    description: "MAXIMUM CLEARANCE. If you are reading this, it is already too late. We have a winner.",
    actionLabel: "Execute",
  },
];
