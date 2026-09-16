import type { GameSlug } from "@/modules/games/core/game.types";

export type RunEndReason = "completed" | "failed" | "quit";

export interface RunResult {
  gameSlug: GameSlug;
  level: number;
  targetTrees: number;
  progress: number;
  score: number;
  trees: number;
  green: number;
  redHits: number;
  durationMs: number;
  endedBy: RunEndReason;
}

export interface HudState {
  gameSlug: GameSlug;
  level: number;
  score: number;
  timeLeft: number;
  trees: number;
  targetTrees: number;
  progress: number;
  green: number;
  redHits: number;
  treeHpPct: number | null;
  combo: number;
  scoreColorClass: string;
  lives: number;
  maxLives: number;
  shieldActive: boolean;
  shieldTimeLeft: number;
  frenzyActive: boolean;
}

export interface LevelClearSummary {
  level: number;
  trees: number;
  targetTrees: number;
  score: number;
  lives: number;
  maxLives: number;
}

export interface GameBridge {
  onHud: (h: HudState) => void;
  onEnd: (r: RunResult) => void;
  onReady: () => void;
  onLevelClear?: (s: LevelClearSummary) => void;
}

export const touchInput = { left: false, right: false, jump: false };

export interface GameOptions {
  runDurationSec: number;
  treeHp: number;
  chopIntervalMs: number;
  pointsPerTree: number;
  pointsPerGreen: number;
  redHitPenaltySec: number;
  redHitScorePenalty: number;
  playerSpeed: number;
  treeSpacingMin: number;
  treeSpacingMax: number;
  candleChanceGreen: number;
  candleChanceRed: number;
  maxDurationSec: number;
  defaultGameSlug: GameSlug;
  levelGoalBase: number;
  levelGoalGrowth: number;
  difficultyGrowth: number;
  maxLevelDurationSec: number;
  initialLevel?: number;
  /** When true, candles use blue/orange palette instead of green/red */
  colorblindMode?: boolean;
  /** When true, disables camera shake, particle bursts, and animations */
  prefersReducedMotion?: boolean;
}
