import type { GameConfig } from "@/lib/config";
import type { GameRunOutcome } from "../core/game.types";

export interface TapChimpScoreInput {
  level: number;
  trees: number;
  green: number;
  redHits: number;
  endedBy?: GameRunOutcome | "time";
}

export function normalizeLevel(level: number | undefined | null): number {
  if (!Number.isFinite(level || 0)) return 1;
  return Math.max(1, Math.min(999999, Math.floor(level || 1)));
}

export function levelDifficulty(level: number, cfg: Pick<GameConfig, "difficultyGrowth">): number {
  const safeLevel = normalizeLevel(level);
  const growth = Math.max(0.01, cfg.difficultyGrowth || 0.09);
  return 1 + (safeLevel - 1) * growth;
}

export function targetTreesForLevel(level: number, cfg: Pick<GameConfig, "levelGoalBase" | "levelGoalGrowth">): number {
  const safeLevel = normalizeLevel(level);
  const base = Math.max(1, Math.floor(cfg.levelGoalBase || 4));
  const growth = Math.max(0, cfg.levelGoalGrowth || 1.15);
  return Math.max(base, Math.round(base + Math.pow(safeLevel - 1, 0.82) * growth));
}

export function treeHpForLevel(level: number, cfg: Pick<GameConfig, "treeHp" | "difficultyGrowth">): number {
  const safeLevel = normalizeLevel(level);
  const base = Math.max(1, Math.floor(cfg.treeHp || 5));
  return Math.min(28, base + Math.floor((safeLevel - 1) / 4));
}

export function chopIntervalForLevel(level: number, cfg: Pick<GameConfig, "chopIntervalMs">): number {
  const safeLevel = normalizeLevel(level);
  const base = Math.max(180, Math.floor(cfg.chopIntervalMs || 450));
  return Math.max(230, base - Math.floor((safeLevel - 1) * 5));
}

export function playerSpeedForLevel(level: number, cfg: Pick<GameConfig, "playerSpeed">): number {
  const safeLevel = normalizeLevel(level);
  const base = Math.max(160, Math.floor(cfg.playerSpeed || 380));
  return Math.min(560, base + Math.floor((safeLevel - 1) * 3));
}

export function maxRedHitsForLevel(level: number): number {
  const safeLevel = normalizeLevel(level);
  return 999999;
}

export function maxDurationForLevelSec(
  level: number,
  cfg: Pick<GameConfig, "maxLevelDurationSec" | "maxDurationSec" | "levelGoalBase" | "levelGoalGrowth" | "treeHp" | "chopIntervalMs">
): number {
  const safeLevel = normalizeLevel(level);
  const configured = Math.max(30, Math.floor(cfg.maxLevelDurationSec || cfg.maxDurationSec || 150));
  const targetTrees = targetTreesForLevel(safeLevel, cfg);
  const hp = treeHpForLevel(safeLevel, { treeHp: cfg.treeHp, difficultyGrowth: 0.09 });
  const chopMs = chopIntervalForLevel(safeLevel, { chopIntervalMs: cfg.chopIntervalMs });
  const minimumFairSec = Math.ceil((targetTrees * hp * chopMs) / 1000 + targetTrees * 2.5 + 18);
  return Math.max(configured, minimumFairSec);
}

export function cumulativeTargetTreesForLevel(level: number, cfg: Pick<GameConfig, "levelGoalBase" | "levelGoalGrowth">): number {
  const safeLevel = normalizeLevel(level);
  let total = 0;
  for (let i = 1; i <= safeLevel; i += 1) {
    total += targetTreesForLevel(i, cfg);
  }
  return total;
}

export function cumulativeMinTreesForLevel(level: number, cfg: Pick<GameConfig, "levelGoalBase" | "levelGoalGrowth">): number {
  const safeLevel = normalizeLevel(level);
  let total = 0;
  for (let i = 1; i < safeLevel; i += 1) {
    total += targetTreesForLevel(i, cfg);
  }
  return total;
}

export function cumulativeMaxDurationSec(
  level: number,
  cfg: Pick<GameConfig, "maxLevelDurationSec" | "maxDurationSec" | "levelGoalBase" | "levelGoalGrowth" | "treeHp" | "chopIntervalMs">
): number {
  const safeLevel = normalizeLevel(level);
  let total = 0;
  for (let i = 1; i <= safeLevel; i += 1) {
    total += maxDurationForLevelSec(i, cfg);
  }
  return total;
}

export function computeTapChimpScore(input: TapChimpScoreInput, cfg: GameConfig): number {
  const treeScore = Math.max(0, Math.floor(input.trees)) * cfg.pointsPerTree;
  const greenScore = Math.max(0, Math.floor(input.green)) * cfg.pointsPerGreen;
  const redPenalty = Math.max(0, Math.floor(input.redHits)) * cfg.redHitScorePenalty;
  return Math.max(0, treeScore + greenScore - redPenalty);
}

export function normalizeOutcome(value: string | undefined): GameRunOutcome {
  if (value === "completed" || value === "failed" || value === "quit") return value;
  return value === "time" ? "failed" : "failed";
}
