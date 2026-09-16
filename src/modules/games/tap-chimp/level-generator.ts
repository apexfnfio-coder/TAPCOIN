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

  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
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
    if (lvl <= 5) {
      return this.int(4500, 5500 - (lvl - 1) * 250);
    } else if (lvl <= 20) {
      return this.int(3200, 4500 - (lvl - 6) * 90);
    } else if (lvl <= 50) {
      return this.int(2200, 3200 - (lvl - 21) * 34);
    }
    return this.int(1400, 2100);
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

  // 4-Tier Dynamic Candle Chances (Anti-inflation: rare green candle bonuses):
  // Tier 1 (Mudah, Lvl 1-5): 50% -> 45% Green
  // Tier 2 (Sedang, Lvl 6-20): 45% -> 40% Green
  // Tier 3 (Sulit, Lvl 21-50): 40% -> 35% Green
  // Tier 4 (Sangat Sulit, Lvl 51+): 35% -> 28% Green
  let greenChance: number;
  let redChance: number;
  if (safeLevel <= 5) {
    greenChance = 0.50 - (safeLevel - 1) * (0.05 / 4);
    redChance = 1 - greenChance;
  } else if (safeLevel <= 20) {
    greenChance = 0.45 - (safeLevel - 6) * (0.05 / 14);
    redChance = 1 - greenChance;
  } else if (safeLevel <= 50) {
    greenChance = 0.40 - (safeLevel - 21) * (0.05 / 29);
    redChance = 1 - greenChance;
  } else {
    greenChance = Math.max(0.28, 0.35 - (safeLevel - 51) * 0.002);
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
