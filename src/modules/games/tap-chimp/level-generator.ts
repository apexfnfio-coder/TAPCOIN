import type { GameConfig } from "@/lib/config";
import type { LevelDefinition } from "../core/game.types";
import { TAP_CHIMP_SLUG } from "./tap-chimp.config";
import {
  chopIntervalForLevel,
  levelDifficulty,
  maxDurationForLevelSec,
  maxRedHitsForLevel,
  normalizeLevel,
  playerSpeedForLevel,
  targetTreesForLevel,
  treeHpForLevel,
} from "./score-rules";

export type CandleKind = "green" | "red";

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class SeededTapChimpGenerator {
  private state: number;

  constructor(seed: string) {
    this.state = hashSeed(seed) || 1;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(this.next() * (high - low + 1)) + low;
  }

  chance(probability: number): boolean {
    return this.next() < Math.max(0, Math.min(1, probability));
  }

  nextTreeSpacing(level: LevelDefinition): number {
    return this.int(level.treeSpacingMin, level.treeSpacingMax);
  }

  nextCandleKind(level: LevelDefinition): CandleKind {
    const total = Math.max(0.01, level.candleChanceGreen + level.candleChanceRed);
    return this.next() < level.candleChanceGreen / total ? "green" : "red";
  }

  nextCandleHeight(): number {
    // All collectibles stay reachable with left/right-only controls; no jump mechanic.
    return this.int(68, 118);
  }

  nextCandlePhase(): number {
    return this.next() * Math.PI * 2;
  }

  nextCandleDelayMs(level: LevelDefinition): number {
    const pressure = Math.min(1500, Math.floor((level.level - 1) * 50));
    return this.int(3500, 6000 - pressure);
  }

  nextCandleOffset(): number {
    return this.int(500, 1100);
  }
}

export function createTapChimpLevel(level: number, cfg: GameConfig, seed?: string): LevelDefinition {
  const safeLevel = normalizeLevel(level);
  const difficulty = levelDifficulty(safeLevel, cfg);
  const spacingMin = Math.max(260, Math.floor(cfg.treeSpacingMin - (safeLevel - 1) * 8));
  const spacingMax = Math.max(spacingMin + 90, Math.floor(cfg.treeSpacingMax - (safeLevel - 1) * 12));
  const redChance = Math.min(0.56, cfg.candleChanceRed + (safeLevel - 1) * 0.012);
  const greenChance = Math.max(0.34, cfg.candleChanceGreen - (safeLevel - 1) * 0.006);

  return {
    gameSlug: TAP_CHIMP_SLUG,
    level: safeLevel,
    seed: seed || `${TAP_CHIMP_SLUG}:${safeLevel}`,
    targetTrees: targetTreesForLevel(safeLevel, cfg),
    treeHp: treeHpForLevel(safeLevel, cfg),
    chopIntervalMs: chopIntervalForLevel(safeLevel, cfg),
    playerSpeed: playerSpeedForLevel(safeLevel, cfg),
    treeSpacingMin: spacingMin,
    treeSpacingMax: spacingMax,
    candleChanceGreen: greenChance,
    candleChanceRed: redChance,
    maxRedHits: maxRedHitsForLevel(safeLevel),
    maxDurationSec: maxDurationForLevelSec(safeLevel, cfg),
    difficulty,
  };
}
