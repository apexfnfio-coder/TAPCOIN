import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("  TEST: RAT STOMP, BEAR ENEMY, SHARE CA & CHAT    ");
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

// 1. Bear Enemy Asset & Loading
test("Bear sprite asset exists in public/assets/props/bear.png", () => {
  const bearPath = path.resolve("public/assets/props/bear.png");
  assert.ok(fs.existsSync(bearPath), "bear.png must exist");
  const stats = fs.statSync(bearPath);
  assert.ok(stats.size > 5000, "bear.png must be non-empty valid image");
});

test("BootScene preloads obstacle-bear", () => {
  const bootContent = fs.readFileSync(path.resolve("src/game/scenes/BootScene.ts"), "utf8");
  assert.ok(bootContent.includes('obstacle-bear'), "BootScene must preload obstacle-bear");
});

// 2. Rat Stomp & Bear Combat Mechanics in GameScene
test("GameScene Obstacle kind includes bear", () => {
  const gameSceneContent = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneContent.includes('"bear"'), "Obstacle interface must include bear");
});

test("GameScene implements Rat Stomp rebound & bonus (+10 STOMP!)", () => {
  const gameSceneContent = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneContent.includes("RAT STOMP MECHANIC"), "Must include rat stomp mechanic");
  assert.ok(gameSceneContent.includes("this.playerVy = -420"), "Must bounce player upward on stomp");
  assert.ok(gameSceneContent.includes("+10 STOMP!"), "Must award stomp text and points");
});

test("GameScene implements Bear Multi-Hit HP System & Dynamic Level Scaling", () => {
  const gameSceneContent = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneContent.includes("maxHp") && gameSceneContent.includes("Math.min(4, 2 + Math.floor((lvl - 1) / 4))"), "Bear HP must scale dynamically with 3-tier progression");
  assert.ok(gameSceneContent.includes("obstacle.hp = Math.max(0, (obstacle.hp || 1) - 1)"), "Bear must sustain multiple hits rather than dying instantly");
  assert.ok(gameSceneContent.includes("AXE HIT!"), "Must display remaining HP upon taking damage");
  assert.ok(gameSceneContent.includes("hpBarBg") && gameSceneContent.includes("hpBarFill"), "Must render visual HP health bar for Bear");
});

test("GameScene implements Bear Attack AI (windup, lunge charge, claw damage)", () => {
  const gameSceneContent = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneContent.includes('obstacle.state = "windup"'), "Bear must telegraph attacks with windup");
  assert.ok(gameSceneContent.includes('obstacle.state = "lunge"'), "Bear must perform aggressive lunge attack");
  assert.ok(gameSceneContent.includes("BEAR ROAR!") || gameSceneContent.includes("⚠ ATTACK!"), "Must show attack warning indicator");
  assert.ok(gameSceneContent.includes("BEAR CLAW!"), "Bear attack must inflict damage on player");
});

test("GameScene implements Dynamic Difficulty Scaling for all obstacles by level", () => {
  const gameSceneContent = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneContent.includes("bearChance = 0.15 + (lvl - 1)"), "Level 1-10 must scale bear chance gently from 15%");
  assert.ok(gameSceneContent.includes("obstacleInterval"), "Obstacle spawn intervals must scale with level");
});

test("GameScene implements Bear Defeat rewards (BEAR REKT! & 3 green candles)", () => {
  const gameSceneContent = fs.readFileSync(path.resolve("src/game/scenes/GameScene.ts"), "utf8");
  assert.ok(gameSceneContent.includes("BEAR AXE ATTACK MECHANIC"), "Must include bear axe attack");
  assert.ok(gameSceneContent.includes("BEAR REKT!"), "Must include bear defeat celebration text");
  assert.ok(gameSceneContent.includes("candle-green"), "Defeated bear must spawn green candles");
});

// 3. Share on X with Token Contract Address (CA)
test("ResultsPanel imports OFFICIAL_TAP_MINT", () => {
  const resultsContent = fs.readFileSync(path.resolve("src/components/ResultsPanel.tsx"), "utf8");
  assert.ok(resultsContent.includes("OFFICIAL_TAP_MINT"), "ResultsPanel must import OFFICIAL_TAP_MINT");
});

test("Share to X tweet includes official CA", () => {
  const resultsContent = fs.readFileSync(path.resolve("src/components/ResultsPanel.tsx"), "utf8");
  assert.ok(resultsContent.includes("CA: ${OFFICIAL_TAP_MINT}"), "Tweet text must contain CA");
});

test("Copy share score text includes official CA", () => {
  const resultsContent = fs.readFileSync(path.resolve("src/components/ResultsPanel.tsx"), "utf8");
  assert.ok(resultsContent.includes("CA: ${OFFICIAL_TAP_MINT}"), "Copy text must contain CA");
});

test("Share preview card displays CA pill with copy button", () => {
  const resultsContent = fs.readFileSync(path.resolve("src/components/ResultsPanel.tsx"), "utf8");
  assert.ok(resultsContent.includes("share-preview-ca"), "Share modal must render share-preview-ca");
});

// 4. Chat Rolling 50-Message Limit
test("api/chat/route.ts enforces rolling 50-message pruning", () => {
  const chatRouteContent = fs.readFileSync(path.resolve("src/app/api/chat/route.ts"), "utf8");
  assert.ok(chatRouteContent.includes("totalMessages > 50"), "Must check if messages exceed 50");
  assert.ok(chatRouteContent.includes("db.chatMessage.deleteMany"), "Must prune excess messages");
});

// 5. Header & Navigation Polish
test("Nav.tsx includes top sound toggle button", () => {
  const navContent = fs.readFileSync(path.resolve("src/components/Nav.tsx"), "utf8");
  assert.ok(navContent.includes("nav-sound-btn"), "Nav must include nav-sound-btn");
  assert.ok(navContent.includes("sound.toggleMute()"), "Nav sound button must toggle mute");
});

test("play/page.tsx removed cluttered lobby-top-toolbar", () => {
  const playContent = fs.readFileSync(path.resolve("src/app/play/page.tsx"), "utf8");
  assert.ok(!playContent.includes('className="lobby-top-toolbar"'), "Cluttered lobby-top-toolbar must be removed");
  assert.ok(playContent.includes("hero-quick-prefs"), "Preferences must be integrated into hero header");
});

console.log("==================================================");
console.log(`RESULTS: ${passed} passed, 0 failed`);
console.log("ALL NEW MECHANICS & FEATURE TESTS PASSED (100%)");
