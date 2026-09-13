import type { GameConfig } from "./config";
import { DEFAULT_GAME_SLUG, isKnownGameSlug } from "@/modules/games/core/game-registry";
import { computeTapChimpScore, createTapChimpLevel, normalizeOutcome, normalizeLevel } from "@/modules/games/tap-chimp";
import type { GameRunOutcome, GameSlug } from "@/modules/games/core/game.types";

export interface RunPayload {
  gameSlug?: string;
  level?: number;
  targetTrees?: number;
  progress?: number;
  score: number;
  trees: number;
  green: number;
  redHits: number;
  durationMs: number;
  endedBy: GameRunOutcome | "time" | "quit";
}

export interface RunVerdict {
  valid: boolean;
  flags: string[];
  expectedScore: number;
  gameSlug: GameSlug;
  level: number;
  targetTrees: number;
  progress: number;
  endedBy: GameRunOutcome;
}

/**
 * Server-side run verification.
 * The client reports counts; the server recomputes the expected score from the
 * authoritative game module/config and applies plausibility checks. Anything
 * that fails is stored but excluded from rankings.
 */
export function verifyRun(p: RunPayload, cfg: GameConfig): RunVerdict {
  const flags: string[] = [];
  const requestedSlug = p.gameSlug || DEFAULT_GAME_SLUG;
  const gameSlug = isKnownGameSlug(requestedSlug) ? requestedSlug : DEFAULT_GAME_SLUG;
  if (!isKnownGameSlug(requestedSlug)) flags.push("UNKNOWN_GAME_SLUG");

  const level = normalizeLevel(p.level || 1);
  const levelDef = createTapChimpLevel(level, cfg);
  const endedBy = normalizeOutcome(p.endedBy);
  const targetTrees = Math.max(1, Math.floor(p.targetTrees || levelDef.targetTrees));
  const progress = Math.max(0, Math.min(targetTrees, Math.floor(p.progress ?? p.trees)));
  const expectedScore = computeTapChimpScore({ level, trees: p.trees, green: p.green, redHits: p.redHits, endedBy }, cfg);

  if (p.score !== expectedScore) flags.push("SCORE_MISMATCH");
  if (targetTrees !== levelDef.targetTrees) flags.push("TARGET_MISMATCH");
  if (p.trees < progress) flags.push("PROGRESS_EXCEEDS_TREES");
  if (endedBy === "completed" && p.trees < levelDef.targetTrees) flags.push("LEVEL_NOT_COMPLETE");
  if (endedBy !== "completed" && progress > levelDef.targetTrees) flags.push("PROGRESS_EXCEEDS_TARGET");
  if (p.trees > levelDef.targetTrees + 2) flags.push("TREE_OVERFLOW");
  if (p.redHits > levelDef.maxRedHits) flags.push("TOO_MANY_RED_HITS");

  const maxMs = levelDef.maxDurationSec * 1000;
  if (p.durationMs <= 0) flags.push("BAD_DURATION");
  if (p.durationMs > maxMs + 1500) flags.push("DURATION_EXCEEDS_LEVEL_MAX");

  const minClearMs = Math.max(1000, levelDef.targetTrees * levelDef.treeHp * levelDef.chopIntervalMs * 0.72);
  if (endedBy === "completed" && p.durationMs < minClearMs) flags.push("DURATION_TOO_SHORT_FOR_CLEAR");

  const maxTrees = Math.ceil(p.durationMs / levelDef.chopIntervalMs / levelDef.treeHp) + 2;
  if (p.trees > maxTrees) flags.push("IMPOSSIBLE_TREE_COUNT");

  const maxCandles = Math.ceil(p.durationMs / 1000) * 3 + 10;
  if (p.green + p.redHits > maxCandles) flags.push("IMPOSSIBLE_CANDLE_COUNT");

  for (const v of [p.score, p.trees, p.green, p.redHits, p.durationMs, level, targetTrees, progress]) {
    if (!Number.isInteger(v) || v < 0) flags.push("NON_INTEGER_FIELD");
  }

  return { valid: flags.length === 0, flags, expectedScore, gameSlug, level, targetTrees, progress, endedBy };
}
