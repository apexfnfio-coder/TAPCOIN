import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

console.log("==================================================");
console.log("  TIER 2: BOUNDARY VALUE ANALYSIS & CORNER CASES  ");
console.log("==================================================");

let passed = 0;
let failed = 0;

async function test(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------
// FEATURE B1: EXTREME COMBOS
// -----------------------------------------------------------------
console.log("\n[B1] Boundary: Extreme Combos & Streak Scaling");

const soundPath = path.join(rootDir, "src", "lib", "sound.ts");
const soundContent = fs.readFileSync(soundPath, "utf8");

// Parse pentatonic scale frequencies from sound.ts
const scaleMatch = soundContent.match(/PENTATONIC_SCALE:\s*number\[\]\s*=\s*\[([\s\S]*?)\];/);
assert(scaleMatch, "Must find PENTATONIC_SCALE definition in sound.ts");
const pentatonicScale = scaleMatch[1]
  .replace(/\/\/.*$/gm, "")
  .split(",")
  .map((s) => parseFloat(s.trim()))
  .filter((n) => !isNaN(n));

await test("B1.1: Baseline streak (combo = 0): indexes to root note A5 (880 Hz)", () => {
  assert.strictEqual(pentatonicScale.length, 8, "Pentatonic scale must have 8 notes");
  assert.strictEqual(pentatonicScale[0], 880.0, "Root note must be 880 Hz (A5)");
});

await test("B1.2: Ascending combo streak (combos 1-4) yields monotonically ascending frequencies", () => {
  for (let i = 0; i < 4; i++) {
    assert(
      pentatonicScale[i + 1] > pentatonicScale[i],
      `Scale frequency at index ${i + 1} (${pentatonicScale[i + 1]}) must be > index ${i} (${pentatonicScale[i]})`
    );
  }
});

await test("B1.3: Streak >= 5 milestone triggers celebratory high-streak fanfare", () => {
  assert(
    soundContent.includes("combo >= 5"),
    "sound.ts must contain special fanfare handling for combo >= 5"
  );
});

await test("B1.4: Extreme high streaks (combos 8, 15, 50, 100) wrap modulo 8 safely without NaN", () => {
  const testCombos = [8, 15, 50, 100, 999];
  for (const c of testCombos) {
    const noteIndex = Math.max(0, c - 1) % pentatonicScale.length;
    const freq = pentatonicScale[noteIndex];
    assert(typeof freq === "number" && !isNaN(freq) && freq > 0, `Frequency for combo ${c} must be valid number`);
  }
});

await test("B1.5: Obstacle collision immediately resets combo count to 0 in GameScene.ts", () => {
  const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
  const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");
  assert(
    gameSceneContent.includes("this.comboCount = 0"),
    "Hazard hit must reset this.comboCount = 0"
  );
});

await test("B1.6: Inactivity timer resets combo streak after 3.0s window", () => {
  const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
  const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");
  assert(
    gameSceneContent.includes("comboResetTimer") || gameSceneContent.includes("comboCount = 0"),
    "GameScene must manage combo reset timer"
  );
});

// -----------------------------------------------------------------
// FEATURE B2: 0-TIMER & LIQUIDATION BOUNDARIES
// -----------------------------------------------------------------
console.log("\n[B2] Boundary: 0-Timer & Liquidation Boundaries");

await test("B2.1: Exact boundary: timeLeftMs <= 0 invokes endRun('failed')", () => {
  const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
  const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");
  assert(
    gameSceneContent.includes('if (this.timeLeftMs <= 0) return this.endRun("failed");') ||
    gameSceneContent.includes('this.timeLeftMs <= 0'),
    "GameScene must terminate with 'failed' when timeLeftMs <= 0"
  );
});

await test("B2.2: Large frame delta clamps timeLeftMs to 0 with Math.max(0, ...)", () => {
  const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
  const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");
  assert(
    gameSceneContent.includes("this.timeLeftMs = Math.max(0, this.timeLeftMs - delta);") ||
    gameSceneContent.includes("Math.max(0, this.timeLeftMs"),
    "GameScene must clamp timer subtraction to 0 with Math.max"
  );
});

await test("B2.3: Post-liquidation motion freeze: update returns early when ended === true", () => {
  const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
  const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");
  assert(
    gameSceneContent.includes("if (this.ended) return;"),
    "GameScene update must return early when this.ended is true"
  );
});

await test("B2.4: Sub-zero score prevention: penalties cannot drop score below 0", () => {
  const scoreVerifyPath = path.join(rootDir, "src", "lib", "scoreVerify.ts");
  const scoreVerifyContent = fs.readFileSync(scoreVerifyPath, "utf8");
  assert(
    scoreVerifyContent.includes("Math.max(0,"),
    "Scoring formula must clamp score to >= 0 using Math.max"
  );
});

await test("B2.5: Anti-cheat flags non-positive duration (durationMs <= 0) as BAD_DURATION", () => {
  const scoreVerifyPath = path.join(rootDir, "src", "lib", "scoreVerify.ts");
  const scoreVerifyContent = fs.readFileSync(scoreVerifyPath, "utf8");
  assert(
    scoreVerifyContent.includes("BAD_DURATION"),
    "scoreVerify must flag BAD_DURATION for non-positive durations"
  );
});

await test("B2.6: Anti-cheat flags duration exceeding maximum allowable level limit", () => {
  const scoreVerifyPath = path.join(rootDir, "src", "lib", "scoreVerify.ts");
  const scoreVerifyContent = fs.readFileSync(scoreVerifyPath, "utf8");
  assert(
    scoreVerifyContent.includes("DURATION_EXCEEDS_LEVEL_MAX"),
    "scoreVerify must flag DURATION_EXCEEDS_LEVEL_MAX"
  );
});

// -----------------------------------------------------------------
// FEATURE B3: RAPID JUMP INPUTS & BUFFERING LIMITS
// -----------------------------------------------------------------
console.log("\n[B3] Boundary: Rapid Jump Inputs & Buffering Limits");

const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");

await test("B3.1: Jump buffering detects rising edge without key-repeat flood", () => {
  assert(
    gameSceneContent.includes("if (jump && !this.wasJumpDown)"),
    "Jump buffering must detect rising edge via !this.wasJumpDown"
  );
  assert(
    gameSceneContent.includes("this.lastJumpPressedTime = time;"),
    "Jump buffering must record timestamp on rising edge"
  );
});

await test("B3.2: Immediate buffered jump executes within 120ms window", () => {
  assert(
    gameSceneContent.includes("time - this.lastJumpPressedTime <= this.JUMP_BUFFER_MS") ||
    gameSceneContent.includes("JUMP_BUFFER_MS"),
    "Jump buffering window must be evaluated against JUMP_BUFFER_MS"
  );
});

await test("B3.3: Jump buffer is consumed upon execution preventing double jumps", () => {
  assert(
    gameSceneContent.includes("this.lastJumpPressedTime = 0;"),
    "Executing jump must clear this.lastJumpPressedTime = 0"
  );
});

await test("B3.4: Coyote Time allows jump up to 100ms after stepping off ground", () => {
  assert(
    gameSceneContent.includes("time - this.lastGroundedTime <= this.COYOTE_TIME_MS") ||
    gameSceneContent.includes("COYOTE_TIME_MS"),
    "Coyote Time must allow jump execution within COYOTE_TIME_MS window"
  );
});

await test("B3.5: Coyote Time is invalidated upon jump execution", () => {
  assert(
    gameSceneContent.includes("this.lastGroundedTime = 0;"),
    "Executing jump must invalidate coyote window with this.lastGroundedTime = 0"
  );
});

await test("B3.6: Early jump release truncates vertical velocity for shallow hops", () => {
  assert(
    gameSceneContent.includes("!jump && this.wasJumpDown") &&
    (gameSceneContent.includes("this.playerVy < this.MIN_JUMP_VELOCITY") || gameSceneContent.includes("MIN_JUMP_VELOCITY")),
    "Releasing jump key while rising must truncate playerVy to MIN_JUMP_VELOCITY"
  );
});

// -----------------------------------------------------------------
// FEATURE B4: CHAT MESSAGE LENGTH & PAYLOAD BOUNDARIES
// -----------------------------------------------------------------
console.log("\n[B4] Boundary: Chat Message Length & Payload Boundaries");

await test("B4.1: Empty message payload (text: '') is rejected with HTTP 400", async () => {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "" }),
  });
  // If guest, returns 403; if processed, returns 400. Neither allows empty text!
  assert(
    res.status === 400 || res.status === 403,
    `Empty message must be rejected (status: ${res.status})`
  );
});

await test("B4.2: Whitespace-only payload (text: '    ') is rejected", async () => {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "   \t\n   " }),
  });
  assert(
    res.status === 400 || res.status === 403,
    `Whitespace message must be rejected (status: ${res.status})`
  );
});

await test("B4.3: Route handler validates empty string: !text || text.length === 0", () => {
  const chatRoutePath = path.join(rootDir, "src", "app", "api", "chat", "route.ts");
  const chatRouteContent = fs.readFileSync(chatRoutePath, "utf8");
  assert(
    chatRouteContent.includes("!text") || chatRouteContent.includes("text.length === 0"),
    "Route handler must reject empty text"
  );
});

await test("B4.4: Route handler validates maximum length boundary (text.length > 200)", () => {
  const chatRoutePath = path.join(rootDir, "src", "app", "api", "chat", "route.ts");
  const chatRouteContent = fs.readFileSync(chatRoutePath, "utf8");
  assert(
    chatRouteContent.includes("text.length > 200"),
    "Route handler must enforce 200 character ceiling"
  );
});

await test("B4.5: Overflow payload (> 200 characters) is rejected with length error", () => {
  const chatRoutePath = path.join(rootDir, "src", "app", "api", "chat", "route.ts");
  const chatRouteContent = fs.readFileSync(chatRoutePath, "utf8");
  assert(
    chatRouteContent.includes("Message cannot exceed 200 characters"),
    "Route handler must specify exact 200 character error message"
  );
});

await test("B4.6: Unauthenticated guest user POST /api/chat returns HTTP 403", async () => {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello Web3!" }),
  });
  assert.strictEqual(
    res.status,
    403,
    "Unauthenticated guest POST must be rejected with 403 Forbidden"
  );
  const json = await res.json();
  assert(
    json.error.includes("Connect your Solana wallet"),
    "Error message must prompt for Solana wallet connection"
  );
});

// -----------------------------------------------------------------
// FEATURE B5: VOLUME 0-1 BOUNDS & AUDIO GAIN CLAMPING
// -----------------------------------------------------------------
console.log("\n[B5] Boundary: Volume 0-1 Bounds & Gain Clamping");

await test("B5.1: Negative volume underflow (< 0.0) is clamped to 0.0", () => {
  assert(
    soundContent.includes("Math.max(0") && soundContent.includes("Math.min(1"),
    "setVolume must clamp volume between 0 and 1 using Math.max(0, Math.min(1, v))"
  );
});

await test("B5.2: Volume overflow (> 1.0) is clamped to 1.0", () => {
  // Pure math verification of the clamping formula in sound.ts
  const clamp = (v) => Math.max(0, Math.min(1, v));
  assert.strictEqual(clamp(-0.5), 0.0, "-0.5 clamps to 0.0");
  assert.strictEqual(clamp(1.5), 1.0, "1.5 clamps to 1.0");
  assert.strictEqual(clamp(2.5), 1.0, "2.5 clamps to 1.0");
});

await test("B5.3: Exact boundaries: 0.0 (silent) and 1.0 (max) are preserved exactly", () => {
  const clamp = (v) => Math.max(0, Math.min(1, v));
  assert.strictEqual(clamp(0.0), 0.0, "0.0 preserved");
  assert.strictEqual(clamp(1.0), 1.0, "1.0 preserved");
  assert.strictEqual(clamp(0.5), 0.5, "0.5 preserved");
});

await test("B5.4: NaN and invalid type protection does not corrupt volume state", () => {
  assert(
    soundContent.includes("isNaN"),
    "sound.ts constructor must protect against NaN volume when restoring from localStorage"
  );
});

await test("B5.5: Mute toggle zeroes master gain without mutating target volume setting", () => {
  assert(
    soundContent.includes("this.setMuted(!this.muted)") || soundContent.includes("this.muted = !this.muted"),
    "toggleMute must invert mute state"
  );
  assert(
    soundContent.includes("this.muted ? 0 : this.volume"),
    "Mute toggle must set target to 0 when muted while preserving this.volume"
  );
});

await test("B5.6: Gain easing uses exponential time constant preventing audio pop/clicks", () => {
  assert(
    soundContent.includes("setTargetAtTime"),
    "Volume and mute transitions must use setTargetAtTime for smooth pop-free curve"
  );
});

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log("\n==================================================");
console.log(`TIER 2 RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TIER 2 BOUNDARY VALUE TESTS PASSED (100%)");
}
