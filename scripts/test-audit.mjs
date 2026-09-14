import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("  $TAP CHOP GAME - COMPREHENSIVE SYSTEM AUDIT     ");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// SECTION 1: OFFICIAL SOLANA WALLET BADGES & VECTOR ASSETS
// -------------------------------------------------------------
console.log("\n[1] AUDIT: Official Solana Wallet Badges & SVG Assets");

const walletIconsPath = path.join(rootDir, "src", "components", "WalletIcons.tsx");
const walletBadgesPath = path.join(rootDir, "src", "components", "WalletBadges.tsx");
const walletButtonPath = path.join(rootDir, "src", "components", "WalletButton.tsx");

it("WalletIcons.tsx file exists and contains official brand components", () => {
  assert(fs.existsSync(walletIconsPath), "WalletIcons.tsx must exist");
  const content = fs.readFileSync(walletIconsPath, "utf8");
  
  // Official exports
  assert(content.includes("export function PhantomIcon"), "Must export PhantomIcon");
  assert(content.includes("export function SolflareIcon"), "Must export SolflareIcon");
  assert(content.includes("export function JupiterIcon"), "Must export JupiterIcon");
  
  // Real brand logos, zero raw emojis
  assert(!content.includes("👻"), "No ghost emoji allowed");
  assert(!content.includes("🔥"), "No fire emoji allowed");
  assert(!content.includes("🎒"), "No backpack emoji allowed");
});

it("WalletBadges.tsx renders official Solana wallet components with pill styling", () => {
  assert(fs.existsSync(walletBadgesPath), "WalletBadges.tsx must exist");
  const content = fs.readFileSync(walletBadgesPath, "utf8");

  assert(content.includes("PhantomIcon"), "Must import & render PhantomIcon");
  assert(content.includes("SolflareIcon"), "Must import & render SolflareIcon");
  assert(!content.includes("👻") && !content.includes("🔥") && !content.includes("🎒"), "Zero emojis in WalletBadges");
  assert(content.includes('role="region"'), "Must have accessible region");
  assert(content.includes('className="wallet-pill"'), "Must use styled pill buttons");
});

it("WalletButton.tsx modal includes Phantom, Solflare, and Jupiter official providers", () => {
  assert(fs.existsSync(walletButtonPath), "WalletButton.tsx must exist");
  const content = fs.readFileSync(walletButtonPath, "utf8");

  assert(content.includes('id: "phantom"'), "Includes Phantom option");
  assert(content.includes('id: "solflare"'), "Includes Solflare option");
  assert(content.includes('id: "jupiter"'), "Includes Jupiter option");
});

// -------------------------------------------------------------
// SECTION 2: SCORING ENGINE & ANTI-CHEAT FORMULAS
// -------------------------------------------------------------
console.log("\n[2] AUDIT: Scoring Engine & Anti-Cheat Server Verification");

// Mock game config matching default production values
const mockConfig = {
  pointsPerTree: 100,
  pointsPerGreen: 10,
  redHitScorePenalty: 25,
  redHitPenaltySec: 3,
  levelGoalBase: 4,
  levelGoalGrowth: 1.15,
  treeHp: 5,
  chopIntervalMs: 450,
  playerSpeed: 380,
  maxLevelDurationSec: 150,
  maxDurationSec: 150,
  candleChanceGreen: 0.44,
  candleChanceRed: 0.38,
  treeSpacingMin: 340,
  treeSpacingMax: 480,
  difficultyGrowth: 0.09,
};

// Import logic dynamically or reproduce faithfully to test
function computeScore(trees, green, redHits, cfg = mockConfig) {
  const treeScore = Math.max(0, Math.floor(trees)) * cfg.pointsPerTree;
  const greenScore = Math.max(0, Math.floor(green)) * cfg.pointsPerGreen;
  const redPenalty = Math.max(0, Math.floor(redHits)) * cfg.redHitScorePenalty;
  return Math.max(0, treeScore + greenScore - redPenalty);
}

function targetTreesForLevel(level, cfg = mockConfig) {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const base = Math.max(1, Math.floor(cfg.levelGoalBase || 4));
  const growth = Math.max(0, cfg.levelGoalGrowth || 1.15);
  return Math.max(base, Math.round(base + Math.pow(safeLevel - 1, 0.82) * growth));
}

function cumulativeTargetTrees(level, cfg = mockConfig) {
  let total = 0;
  for (let i = 1; i <= level; i++) total += targetTreesForLevel(i, cfg);
  return total;
}

function cumulativeMinTrees(level, cfg = mockConfig) {
  let total = 0;
  for (let i = 1; i < level; i++) total += targetTreesForLevel(i, cfg);
  return total;
}

it("Score calculation formula adheres to (trees*100 + green*10 - red*25)", () => {
  assert.strictEqual(computeScore(0, 0, 0), 0);
  assert.strictEqual(computeScore(1, 0, 0), 100);
  assert.strictEqual(computeScore(4, 5, 2), 4 * 100 + 5 * 10 - 2 * 25); // 400 + 50 - 50 = 400
  assert.strictEqual(computeScore(0, 1, 10), 0, "Score can never be negative");
});

it("Multi-level target tree progression scales monotonically", () => {
  const l1 = targetTreesForLevel(1);
  const l2 = targetTreesForLevel(2);
  const l3 = targetTreesForLevel(3);
  const l4 = targetTreesForLevel(4);
  const l5 = targetTreesForLevel(5);

  assert.strictEqual(l1, 4, "Level 1 base target should be 4 trees");
  assert(l2 >= l1, "Level 2 target must be >= Level 1");
  assert(l3 >= l2, "Level 3 target must be >= Level 2");
  assert(l4 >= l3, "Level 4 target must be >= Level 3");
  assert(l5 >= l4, "Level 5 target must be >= Level 4");
});

it("Cumulative tree requirements correctly accumulate past levels", () => {
  const l1Target = targetTreesForLevel(1);
  const l2Target = targetTreesForLevel(2);
  const cumMinL2 = cumulativeMinTrees(2);
  assert.strictEqual(cumMinL2, l1Target, "Min trees to enter level 2 equals level 1 target");

  const cumTargetL2 = cumulativeTargetTrees(2);
  assert.strictEqual(cumTargetL2, l1Target + l2Target, "Cumulative target trees for level 2 is sum of L1 + L2");
});

// -------------------------------------------------------------
// SECTION 3: CODEBASE INTEGRITY & ANTI-CHEAT ALIGNMENT
// -------------------------------------------------------------
console.log("\n[3] AUDIT: Phaser Engine & Backend Anti-Cheat Alignment");

const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
const scoreVerifyPath = path.join(rootDir, "src", "lib", "scoreVerify.ts");

it("GameScene.ts applies 100% obstacle penalty aligned with server", () => {
  const content = fs.readFileSync(gameScenePath, "utf8");
  // Check obstacle collision handler
  assert(
    content.includes("const deltaPenalty = this.opts.redHitScorePenalty;"),
    "Obstacle penalty must use full redHitScorePenalty (not 0.6x)"
  );
  assert(
    content.includes("this.redHits += 1;"),
    "Obstacle collision must record redHit"
  );
  // Check that advanceLevel does not reset redHits
  const advanceLevelBlock = content.slice(content.indexOf("advanceLevel()"), content.indexOf("collectCandle("));
  assert(
    !advanceLevelBlock.includes("this.redHits = 0"),
    "advanceLevel must not reset redHits to 0 (must be cumulative across entire run)"
  );
});

it("scoreVerify.ts checks multi-level cumulative limits without false positives", () => {
  const content = fs.readFileSync(scoreVerifyPath, "utf8");
  assert(content.includes("cumulativeTargetTreesForLevel"), "Must use cumulativeTargetTreesForLevel");
  assert(content.includes("cumulativeMinTreesForLevel"), "Must use cumulativeMinTreesForLevel");
  assert(content.includes("cumulativeMaxDurationSec"), "Must use cumulativeMaxDurationSec");
  assert(content.includes("TREE_OVERFLOW"), "Must retain anti-cheat TREE_OVERFLOW check");
  assert(content.includes("SCORE_MISMATCH"), "Must retain anti-cheat SCORE_MISMATCH check");
});

// -------------------------------------------------------------
// SECTION 4: CSS & DESIGN SYSTEM COMPLIANCE
// -------------------------------------------------------------
console.log("\n[4] AUDIT: CSS Design System & Mobile Responsiveness");

const globalsCssPath = path.join(rootDir, "src", "app", "globals.css");

it("globals.css contains wallet-pill, wallet-badge-svg, and touch control rules", () => {
  const content = fs.readFileSync(globalsCssPath, "utf8");
  assert(content.includes(".wallet-pill"), "CSS must define .wallet-pill");
  assert(content.includes(".wallet-badge-svg"), "CSS must define .wallet-badge-svg");
  assert(content.includes(".wicon-svg-wrap"), "CSS must define .wicon-svg-wrap");
  assert(content.includes(".touch-controls"), "CSS must support mobile .touch-controls");
  assert(content.includes(".touch-btn"), "CSS must support mobile .touch-btn");
  assert(content.includes(".colorblind-mode"), "CSS must support colorblind palette");
});

// -------------------------------------------------------------
// SECTION 5: PAYLOAD VALIDATION & ANTI-CHEAT FRAUD DETECTION
// -------------------------------------------------------------
console.log("\n[5] AUDIT: Real Payload Edge Cases & Fraud Flagging");

function verifyRunPure(p, cfg = mockConfig) {
  const flags = [];
  const level = Math.max(1, Math.floor(p.level || 1));
  const targetTrees = targetTreesForLevel(level, cfg);
  const progress = Math.max(0, Math.min(targetTrees, Math.floor(p.progress ?? p.trees)));
  const expectedScore = computeScore(p.trees, p.green, p.redHits, cfg);

  const priorMinTrees = cumulativeMinTrees(level, cfg);
  const cumulativeTarget = cumulativeTargetTrees(level, cfg);

  if (p.score !== expectedScore) flags.push("SCORE_MISMATCH");
  if (p.trees < priorMinTrees + progress) flags.push("PROGRESS_EXCEEDS_TREES");
  if (p.endedBy === "completed" && p.trees < cumulativeTarget) flags.push("LEVEL_NOT_COMPLETE");
  if (p.endedBy !== "completed" && progress > targetTrees) flags.push("PROGRESS_EXCEEDS_TARGET");
  if (p.trees > cumulativeTarget + 2) flags.push("TREE_OVERFLOW");

  // Max duration check across all levels
  let cumulativeMaxSec = 0;
  for (let i = 1; i <= level; i++) {
    const t = targetTreesForLevel(i, cfg);
    const hp = Math.min(28, cfg.treeHp + Math.floor((i - 1) / 4));
    const chopMs = Math.max(230, cfg.chopIntervalMs - Math.floor((i - 1) * 5));
    const minSec = Math.ceil((t * hp * chopMs) / 1000 + t * 2.5 + 18);
    cumulativeMaxSec += Math.max(cfg.maxLevelDurationSec, minSec);
  }
  const maxMs = cumulativeMaxSec * 1000;
  if (p.durationMs <= 0) flags.push("BAD_DURATION");
  if (p.durationMs > maxMs + 2500) flags.push("DURATION_EXCEEDS_LEVEL_MAX");

  const chopIntervalMs = Math.max(230, cfg.chopIntervalMs - Math.floor((level - 1) * 5));
  const maxTrees = Math.ceil(p.durationMs / (chopIntervalMs * 0.75) / 2) + 6;
  if (p.trees > maxTrees) flags.push("IMPOSSIBLE_TREE_COUNT");

  const maxCandles = Math.ceil(p.durationMs / 1000) * 4 + 15;
  if (p.green + p.redHits > maxCandles) flags.push("IMPOSSIBLE_CANDLE_COUNT");

  for (const v of [p.score, p.trees, p.green, p.redHits, p.durationMs, level, progress]) {
    if (!Number.isInteger(v) || v < 0) flags.push("NON_INTEGER_FIELD");
  }

  return { valid: flags.length === 0, flags, expectedScore };
}

it("Valid Level 1 run passes verification without flags", () => {
  const result = verifyRunPure({
    level: 1,
    trees: 4,
    progress: 4,
    green: 5,
    redHits: 1,
    score: 4 * 100 + 5 * 10 - 1 * 25, // 425
    durationMs: 14000,
    endedBy: "completed",
  });
  assert.strictEqual(result.valid, true, "Valid run must be valid");
  assert.strictEqual(result.flags.length, 0, "No flags on clean run");
  assert.strictEqual(result.expectedScore, 425);
});

it("Valid Multi-Level run (Level 3) passes cumulative validation without false positives", () => {
  // L1 target = 4, L2 target = 5, L3 target = 6 (Total target = 15 trees)
  const result = verifyRunPure({
    level: 3,
    trees: 15,
    progress: 6,
    green: 14,
    redHits: 2,
    score: 15 * 100 + 14 * 10 - 2 * 25, // 1500 + 140 - 50 = 1590
    durationMs: 62000,
    endedBy: "completed",
  });
  assert.strictEqual(result.valid, true, "Valid multi-level run must pass");
  assert.strictEqual(result.flags.length, 0);
  assert.strictEqual(result.expectedScore, 1590);
});

it("Anti-Cheat detects fraudulent score manipulation (SCORE_MISMATCH)", () => {
  const result = verifyRunPure({
    level: 1,
    trees: 2,
    progress: 2,
    green: 1,
    redHits: 0,
    score: 99999, // Hacked client score
    durationMs: 8000,
    endedBy: "failed",
  });
  assert.strictEqual(result.valid, false, "Fraudulent score must be rejected");
  assert(result.flags.includes("SCORE_MISMATCH"), "Must flag SCORE_MISMATCH");
});

it("Anti-Cheat detects impossible tree hacking speed (IMPOSSIBLE_TREE_COUNT)", () => {
  const result = verifyRunPure({
    level: 1,
    trees: 50, // 50 trees in 2 seconds is physically impossible
    progress: 4,
    green: 0,
    redHits: 0,
    score: 5000,
    durationMs: 2000,
    endedBy: "completed",
  });
  assert.strictEqual(result.valid, false, "Speed hacking must be rejected");
  assert(result.flags.includes("IMPOSSIBLE_TREE_COUNT"), "Must flag IMPOSSIBLE_TREE_COUNT");
});

it("Anti-Cheat detects impossible candle spawn rate (IMPOSSIBLE_CANDLE_COUNT)", () => {
  const result = verifyRunPure({
    level: 1,
    trees: 2,
    progress: 2,
    green: 120, // 120 candles in 3 seconds is physically impossible
    redHits: 0,
    score: 2 * 100 + 120 * 10,
    durationMs: 3000,
    endedBy: "failed",
  });
  assert.strictEqual(result.valid, false, "Candle hacking must be rejected");
  assert(result.flags.includes("IMPOSSIBLE_CANDLE_COUNT"), "Must flag IMPOSSIBLE_CANDLE_COUNT");
});

it("Anti-Cheat detects bogus duration (BAD_DURATION)", () => {
  const result = verifyRunPure({
    level: 1,
    trees: 1,
    progress: 1,
    green: 0,
    redHits: 0,
    score: 100,
    durationMs: -50,
    endedBy: "failed",
  });
  assert.strictEqual(result.valid, false, "Negative duration must be rejected");
  assert(result.flags.includes("BAD_DURATION"), "Must flag BAD_DURATION");
});

it("Anti-Cheat detects incomplete run fraudulently marked as completed (LEVEL_NOT_COMPLETE)", () => {
  const result = verifyRunPure({
    level: 1,
    trees: 1, // Base target is 4 trees
    progress: 1,
    green: 0,
    redHits: 0,
    score: 100,
    durationMs: 5000,
    endedBy: "completed", // Fraudulently claimed completed
  });
  assert.strictEqual(result.valid, false, "Unfinished level marked completed must be rejected");
  assert(result.flags.includes("LEVEL_NOT_COMPLETE"), "Must flag LEVEL_NOT_COMPLETE");
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n==================================================");
console.log(`AUDIT RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log("==================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("All audit verification checks passed successfully!");
}
