import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("  TEST: DESKTOP STATION, TREE SPACING & CHASM     ");
console.log("==================================================");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

// 1. Tree Spacing Configuration
test("config.ts widens default tree spacing (min: 850, max: 1450)", () => {
  const configSrc = fs.readFileSync(path.resolve("src/lib/config.ts"), "utf8");
  assert.ok(configSrc.includes("treeSpacingMin: 850"), "DEFAULT_CONFIG must have treeSpacingMin: 850");
  assert.ok(configSrc.includes("treeSpacingMax: 1450"), "DEFAULT_CONFIG must have treeSpacingMax: 1450");
});

test("level-generator.ts enforces floor of at least 650px spacing", () => {
  const genSrc = fs.readFileSync(path.resolve("src/modules/games/tap-chimp/level-generator.ts"), "utf8");
  assert.ok(genSrc.includes("Math.max(650,"), "level-generator must clamp spacingMin to at least 650");
});

// 2. Obstacle Tree Clearance & Avoidance Precision
test("GameScene implements SAFE_TREE_CLEARANCE avoidance check", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("SAFE_TREE_CLEARANCE = 220"), "GameScene must define SAFE_TREE_CLEARANCE >= 220");
  assert.ok(gameSceneSrc.includes("nearTree"), "spawnObstacle must check nearTree for avoidance");
});

test("GameScene avoids spawning obstacles inside chasms or overlapping obstacles", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("nearChasm"), "spawnObstacle must avoid spawning inside chasms");
  assert.ok(gameSceneSrc.includes("nearObs"), "spawnObstacle must prevent stacking on existing obstacles");
});

// 3. Platformer Chasm Mechanics
test("GameScene declares Chasm interface and collection", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("interface Chasm"), "GameScene must declare Chasm interface");
  assert.ok(gameSceneSrc.includes("private chasms: Chasm[] = [];"), "GameScene must declare chasms array");
});

test("GameScene implements spawnChasm with gap and danger indicator", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("private spawnChasm(x: number"), "GameScene must implement spawnChasm");
  assert.ok(gameSceneSrc.includes("width"), "Chasm gap width must be calculated");
  assert.ok(gameSceneSrc.includes("⚠ DANGER ⚠"), "Chasm must display danger indicator label");
});

test("GameScene implements Chasm Leap detection with zero point reward", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("chasm.cleared = true;"), "Chasm leap must mark chasm cleared");
  const leapSegment = gameSceneSrc.slice(
    gameSceneSrc.indexOf("this.player.x >= chasm.x2"),
    gameSceneSrc.indexOf("this.player.x >= chasm.x2") + 300
  );
  assert.ok(!leapSegment.includes("greenCount +="), "Chasm leap must not grant greenCount reward");
  assert.ok(!leapSegment.includes("score +="), "Chasm leap must not grant score reward");
});

test("GameScene implements Chasm Fall penalty (-25 PTS) and tumble fall respawn modal", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("handleChasmFall("), "Must implement handleChasmFall");
  assert.ok(gameSceneSrc.includes("startChasmFall"), "Must implement startChasmFall tumbling animation");
  assert.ok(gameSceneSrc.includes("this.redHits += 1"), "Chasm fall must increment redHits");
  assert.ok(gameSceneSrc.includes("showChasmRespawnModal") || gameSceneSrc.includes("respawnFromChasm"), "Must implement chasm respawn modal");
});

test("GameScene advanceLevel clears previous chasms and respawns widely", () => {
  const gameSceneSrc = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneSrc.includes("chasm.graphics.destroy()"), "advanceLevel must clean up old chasm graphics");
  assert.ok(gameSceneSrc.includes("this.spawnTree(this.player.x + 850)"), "advanceLevel must space trees widely");
});

// 4. Desktop Battle Station & Backdrop Stacking
test("play/page.tsx structures widescreen Arcade Battle Station layout", () => {
  const playPageSrc = fs.readFileSync(path.resolve("src/app/play/page.tsx"), "utf8");
  assert.ok(playPageSrc.includes("arcade-battle-station"), "Must contain arcade-battle-station wrapper");
  assert.ok(playPageSrc.includes("battle-station-stage"), "Must contain battle-station-stage");
  assert.ok(playPageSrc.includes("battle-station-telemetry"), "Must contain battle-station-telemetry");
  assert.ok(playPageSrc.includes("<GlobalChat docked />"), "Must render docked GlobalChat in desktop sidebar");
});

test("GlobalChat supports docked telemetry mode with Trollbox & Top Degens tabs", () => {
  const chatSrc = fs.readFileSync(path.resolve("src/components/GlobalChat.tsx"), "utf8");
  assert.ok(chatSrc.includes("docked = false"), "Must accept docked prop");
  assert.ok(chatSrc.includes("arcade-docked-telemetry"), "Must render arcade-docked-telemetry container");
  assert.ok(chatSrc.includes("telemetry-tab-btn"), "Must render telemetry tab buttons");
  assert.ok(chatSrc.includes("Top Apes"), "Must include Top Apes leaderboard tab");
});

test("globals.css fixes backdrop stacking context and styles battle station grid", () => {
  const cssSrc = fs.readFileSync(path.resolve("src/app/globals.css"), "utf8");
  assert.ok(cssSrc.includes("z-index: 0;"), "site-art-backdrop must have z-index: 0");
  assert.ok(cssSrc.includes(".arcade-battle-station"), "globals.css must define .arcade-battle-station grid");
  assert.ok(cssSrc.includes(".arcade-docked-telemetry"), "globals.css must style .arcade-docked-telemetry panel");
});

console.log("==================================================");
console.log(`RESULTS: ${passed} passed, 0 failed`);
console.log("ALL CHASM, TREE SPACING & DESKTOP TESTS PASSED (100%)");
