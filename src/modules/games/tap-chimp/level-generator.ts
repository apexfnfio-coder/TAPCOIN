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
    const lvl = level.level;
    if (lvl <= 10) {
      return this.int(2200, 2800 - (lvl - 1) * 60);
    } else if (lvl <= 50) {
      return this.int(1600, 2200 - (lvl - 10) * 15);
    }
    return this.int(1000, 1500);
  }

  nextCandleOffset(): number {
    return this.int(-80, 480);
  }
}

export function createTapChimpLevel(level: number, cfg: GameConfig, seed?: string): LevelDefinition {
  const safeLevel = normalizeLevel(level);
  const difficulty = levelDifficulty(safeLevel, cfg);
  const spacingMin = Math.max(650, Math.floor(cfg.treeSpacingMin - (safeLevel - 1) * 8));
  const spacingMax = Math.max(spacingMin + 120, Math.floor(cfg.treeSpacingMax - (safeLevel - 1) * 12));

  // 3-Tier Dynamic Candle Chances:
  // Level 1-10 (Mudah): 85% Green -> 70% Green (15% Red -> 30% Red)
  // Level 10-50 (Sedang): 70% Green -> 50% Green (30% Red -> 50% Red)
  // Level 50+ (Sulit): 45% Green / 55% Red
  let greenChance: number;
  let redChance: number;
  if (safeLevel <= 10) {
    greenChance = 0.85 - (safeLevel - 1) * (0.15 / 9);
    redChance = 1 - greenChance;
  } else if (safeLevel <= 50) {
    greenChance = 0.70 - (safeLevel - 10) * (0.20 / 40);
    redChance = 1 - greenChance;
  } else {
    greenChance = Math.max(0.42, 0.50 - (safeLevel - 50) * 0.002);
    redChance = 1 - greenChance;
  }

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
