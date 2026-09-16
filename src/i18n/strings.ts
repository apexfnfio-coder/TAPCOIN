/**
 * Centralized string catalog for $TAP game UI.
 * Standardized copy across lobby, HUD, results, and help dialogs.
 * Prepared for future localization (e.g., id/en).
 */
export const strings = {
  // Brand & Tagline
  gameTitle: "$TAP CHOP GAME",
  tagline: "CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT.",
  heroSubcopy:
    "Slice green candles for God Candle surges. Leap over brutal red dumps. The Solana chart pumps forever — don't get liquidated.",
  infiniteLevelsRule:
    "The Solana chart has no ceiling. Infinite levels, accelerating velocity. You only stop when the clock liquidates you or you cash out.",

  // Navigation & Actions
  home: "Home",
  compete: "Compete",
  play: "Play",
  ranks: "Ranks",
  profile: "Profile",
  howToPlayNav: "How to Play",
  buyTap: "Trade $TAP",
  buyTapBadge: "TRADE $TAP",
  buyTapTooltip: "Trade $TAP on Jupiter / Raydium DEX",
  leaderboard: "Leaderboard",
  viewCompetition: "View Competition",

  // CTAs
  playNow: "DROP IN & CHOP",
  connectWallet: "Connect Wallet",
  tryDemo: "FREE PRACTICE",
  starting: "IGNITING ENGINE…",
  endRun: "CASH OUT / SURRENDER",
  playAgain: "RUN IT BACK",
  shareScore: "FLEX SCORE ON X",
  viewLeaderboard: "View Leaderboard",
  connectToSave: "Connect wallet to lock scores & farm $TAP",
  walletRequiredNote:
    "Plug in your Phantom or Solflare wallet to claim your leaderboard rank and lock in your airdrop bag.",

  // Empty States & Contextual Record Displays
  currentRun: "MISSION BRIEFING",
  startingLevel: "Starting level",
  firstTarget: "First target",
    yourRecord: "YOUR RECORD",
  bestScore: "Best score",
  totalRuns: "Runs",
  totalTrees: "Trees",
  tapRewards: "$TAP rewards",
  connectWalletRecord: "Connect wallet to record your verified ATH",
  firstRunStartsNow: "Your maiden run begins now",
  globalWeeklyTreesFallback: "142,850+ timber felled across Solana this week",

  // Core Mechanic Legend
  greenPoints: "+ GOD CANDLE SURGE",
  redPenalty: "− BEAR MARKET DUMP",
  greenTooltip: "Green candles ignite God Candle Surges (+10 pts & combo multipliers)",
  redTooltip: "Red candles dump your bag (−25 pts & −3s clock burn)",

  // How to Play Page & Section
  howToPlay: {
    title: "How to Play",
    subtitle: "Master candlestick volatility and climb the infinite Solana trading ladder.",
    whatToChop: {
      title: "Chop Timber & Catch God Candles",
      desc: "Chop timber to advance levels. Slicing GREEN candles triggers God Candle Surges and chains combo multipliers.",
      greenBonus: "+10 pts / green candle",
      treeBonus: "+100 pts / tree felled",
    },
    whatToAvoid: {
      title: "Dodge Red Dumps & Obstacles",
      desc: "RED candles punish your score and burn valuable time. Avoid hazards (rats, branches, wet mops) to keep your streak alive.",
      scorePenalty: "−25 pts / red candle hit",
      timePenalty: "−3.0s time penalty",
    },
    scoring: {
      title: "Scoring Mechanics",
      desc: "Every tree felled grants 100 points. Green candles reward 10 points and increment your combo multiplier. Penalties deduct 25 points.",
      rule1: "100 pts per felled tree",
      rule2: "+10 pts per green candle",
      rule3: "Chain green candles to boost combo score",
    },
    progression: {
      title: "Infinite Level Progression",
      desc: "The Solana chart never stops climbing. Each cleared level increases player speed, tightens obstacle spacing, and amplifies candle frequency.",
    },
    runEnd: {
      title: "When Does a Run End?",
      desc: "Your run ends when your lives run out (0 ❤️) or you hit Cash Out. Protect your lives at all costs!",
    },
    wallet: {
      title: "Solana Wallet Authentication",
      desc: "Connect your Phantom or Solflare wallet to record verifiable high scores, qualify for leaderboard rewards and lock in your verified score.",
    },
  },

  // First-Run Tutorial Overlay
  tutorial: {
    step1Title: "Slice GOD CANDLES",
    step1Desc:
      "GREEN candles spark God Candle Surges (+ points). Collect them along the road to ignite streaks and massive combo multipliers.",
    step2Title: "Dodge BEAR MARKET DUMPS",
    step2Desc:
      "RED candles rain from the sky, docking your score (−25 PTS) and taking away 1 Life (−1 ❤️). Dodge them or protect yourself with a Shield!",
    step3Title: "The Chart Pumps Forever",
    step3Desc:
      "Survive as long as you can. The chart never stops. Level up infinitely and compete for global leaderboard rewards.",
    skip: "Skip Tutorial",
    next: "Next",
    start: "Let's Chop!",
  },

  // Results / Post-Run Screen
  runResults: "RUN RESULTS",
  levelReached: "Level reached",
  levelProgress: "Level progress",
  runTime: "Run time",
  treesChopped: "Trees chopped",
  greenCandles: "Green candles",
  redHits: "Red hits",
  newPersonalBest: "🚀 NEW ALL-TIME HIGH (ATH)!",
  awayFromBest: "from breaking your ATH",
  demoBadge: "FREE PRACTICE — UNVERIFIED RUN",
  demoNotice:
    "Practice run completed! Connect your Solana wallet to write verified runs to the leaderboard and lock in your airdrop bag.",

  // Rewards Breakdown
  rewardsBreakdown: "$TAP Rewards Breakdown",
  pointsPerTree: "Points per tree",
  pointsPerTreeValue: "100 pts / tree",
  levelMultiplier: "Level multiplier",
  levelMultiplierValue: "1.2× per level",
  claimCadence: "Prize Distribution",
  claimCadenceValue: "Monthly distribution (10% of game fees)",
  rewardsBackendNotice:
    "Leaderboard rewards receive 10% of game fees. The remaining game fees support $TAP through documented buyback and burn operations.",

  // Sound & Accessibility
  soundToggle: "Toggle game sound",
  soundOn: "Sound: ON",
  soundOff: "Sound: MUTED",
  colorblindToggle: "Toggle colorblind-accessible palette",
  colorblindOn: "Colorblind: Blue / Orange active",
  colorblindOff: "Colorblind: Off (Green / Red)",
};

