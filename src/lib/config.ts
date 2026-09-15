import { db } from "./db";
import {
  OFFICIAL_TAP_MINT,
  TAP_CHIMP_MIN_HOLDING_USD,
  TAP_CHIMP_SAFE_PRICE_USD,
  TAP_CHIMP_SLUG,
} from "@/modules/games/tap-chimp";

/**
 * Centralized configuration — single source of truth.
 * Defaults live here; DB `Config` rows override them.
 * Admin writes go to DB; user-facing app always reads through this module.
 */

export interface GameConfig {
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
  defaultGameSlug: string;
  levelGoalBase: number;
  levelGoalGrowth: number;
  difficultyGrowth: number;
  maxLevelDurationSec: number;
}

export interface TokenConfig {
  symbol: string;
  name: string;
  contractAddress: string;
  cluster: string;
  decimals: number;
  buyLinks: { label: string; url: string }[];
  explorerUrl: string;
  priceUsd: number;
  priceSource: "local" | "manual" | "api";
  minHoldingUsd: number;
}

export interface LinksConfig {
  twitter: string;
  telegram: string;
  tiktok?: string;
  discord: string;
  website: string;
}

export interface LeaderboardEligibilityConfig {
  enabled: boolean;
  state: "requires-token" | "open";
  text: string;
}

export interface PublicConfig {
  game: GameConfig;
  token: TokenConfig;
  links: LinksConfig;
  leaderboardEligibility: LeaderboardEligibilityConfig;
  announcement: string;
  maintenance: boolean;
}

export const DEFAULT_CONFIG: PublicConfig = {
  game: {
    runDurationSec: 60,
    treeHp: 5,
    chopIntervalMs: 450,
    pointsPerTree: 100,
    pointsPerGreen: 10,
    redHitPenaltySec: 0,
    redHitScorePenalty: 25,
    playerSpeed: 380,
    treeSpacingMin: 850,
    treeSpacingMax: 1450,
    candleChanceGreen: 0.56,
    candleChanceRed: 0.28,
    maxDurationSec: 60,
    defaultGameSlug: TAP_CHIMP_SLUG,
    levelGoalBase: 4,
    levelGoalGrowth: 1.2,
    difficultyGrowth: 0.09,
    maxLevelDurationSec: 60,
  },
  token: {
    symbol: "$TAP",
    name: "TAP Token",
    contractAddress: OFFICIAL_TAP_MINT,
    cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta",
    decimals: 6,
    buyLinks: [
      {
        label: "DexScreener",
        url: `https://dexscreener.com/solana/${OFFICIAL_TAP_MINT}`,
      },
    ],
    explorerUrl: `https://dexscreener.com/solana/${OFFICIAL_TAP_MINT}`,
    priceUsd: TAP_CHIMP_SAFE_PRICE_USD,
    priceSource: "api",
    minHoldingUsd: 0,
  },
  links: {
    twitter: "https://x.com/solanatapcoin",
    telegram: "https://t.me/tapcoinSolana",
    tiktok: "https://www.tiktok.com/@tappumpfun",
    discord: "",
    website: "",
  },
  leaderboardEligibility: {
    enabled: false,
    state: "open",
    text: "Open leaderboard — play and compete for top ranks!",
  },
  announcement: "",
  maintenance: false,
};

const CONFIG_KEY = "public";

function normalizePriceSource(value: unknown): TokenConfig["priceSource"] {
  return value === "manual" || value === "api" || value === "local" ? value : "local";
}

function normalizeConfig(stored: Partial<PublicConfig>): PublicConfig {
  const mergedToken = { ...DEFAULT_CONFIG.token, ...(stored.token || {}) };
  return {
    game: { ...DEFAULT_CONFIG.game, ...(stored.game || {}) },
    token: {
      ...mergedToken,
      contractAddress: mergedToken.contractAddress || OFFICIAL_TAP_MINT,
      priceUsd: Number.isFinite(Number(mergedToken.priceUsd)) ? Number(mergedToken.priceUsd) : TAP_CHIMP_SAFE_PRICE_USD,
      priceSource: normalizePriceSource(mergedToken.priceSource),
      minHoldingUsd: Number.isFinite(Number(mergedToken.minHoldingUsd)) ? Number(mergedToken.minHoldingUsd) : TAP_CHIMP_MIN_HOLDING_USD,
    },
    links: { ...DEFAULT_CONFIG.links, ...(stored.links || {}) },
    leaderboardEligibility: {
      ...DEFAULT_CONFIG.leaderboardEligibility,
      ...(stored.leaderboardEligibility || {}),
    },
    announcement: stored.announcement ?? DEFAULT_CONFIG.announcement,
    maintenance: stored.maintenance ?? DEFAULT_CONFIG.maintenance,
  };
}

export async function getConfig(): Promise<PublicConfig> {
  try {
    const row = await db.config.findUnique({ where: { key: CONFIG_KEY } });
    if (!row) return DEFAULT_CONFIG;
    const stored = JSON.parse(row.value) as Partial<PublicConfig>;
    return normalizeConfig(stored);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(cfg: PublicConfig, updatedById?: string) {
  await db.config.upsert({
    where: { key: CONFIG_KEY },
    update: { value: JSON.stringify(normalizeConfig(cfg)), updatedById },
    create: { key: CONFIG_KEY, value: JSON.stringify(normalizeConfig(cfg)), updatedById },
  });
}
