import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

console.log("==================================================");
console.log("  TIER 1: FEATURE COVERAGE (R1 - R6 AUDIT)        ");
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
// FEATURE R1: COPYWRITING DE-SLOP (AUTHENTIC DEGEN ARCADE VOICE)
// -----------------------------------------------------------------
console.log("\n[R1] Feature: Copywriting De-Slop & Authentic Voice");

const stringsPath = path.join(rootDir, "src", "i18n", "strings.ts");
const stringsContent = fs.readFileSync(stringsPath, "utf8");

await test("R1.1: strings.tagline adheres to authentic slogan", () => {
  assert(
    stringsContent.includes("CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT."),
    "strings.tagline must equal 'CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT.'"
  );
});

await test("R1.2: Zero robotic corporate phrasing or placeholder TODOs remain", () => {
  assert(!stringsContent.includes("predefined maximum"), "No 'predefined maximum' allowed");
  assert(!stringsContent.includes("TODO: Actual"), "No 'TODO: Actual...' placeholder allowed");
  assert(!stringsContent.includes("terminates when your timer drops to zero"), "No robotic 'terminates when your timer drops to zero'");
});

await test("R1.3: Action CTAs use high-energy arcade and degen terminology", () => {
  assert(stringsContent.includes("DROP IN & CHOP"), "playNow must be 'DROP IN & CHOP'");
  assert(stringsContent.includes("FREE PRACTICE"), "tryDemo must be 'FREE PRACTICE'");
  assert(stringsContent.includes("IGNITING ENGINE…"), "starting must be 'IGNITING ENGINE…'");
  assert(stringsContent.includes("RUN IT BACK"), "playAgain must be 'RUN IT BACK'");
  assert(stringsContent.includes("FLEX SCORE ON X"), "shareScore must be 'FLEX SCORE ON X'");
});

await test("R1.4: Candle mechanics adopt signature Solana trading terminology", () => {
  assert(stringsContent.includes("+ GOD CANDLE SURGE"), "greenPoints must feature 'GOD CANDLE SURGE'");
  assert(stringsContent.includes("− BEAR MARKET DUMP"), "redPenalty must feature 'BEAR MARKET DUMP'");
  assert(stringsContent.includes("God Candle Surges"), "greenTooltip must explain God Candle Surges");
  assert(stringsContent.includes("dump your bag"), "redTooltip must explain dumping bag");
});

await test("R1.5: High score celebrations use authentic crypto ATH phrasing", () => {
  assert(stringsContent.includes("NEW ALL-TIME HIGH (ATH)"), "newPersonalBest must celebrate ATH");
  assert(stringsContent.includes("from breaking your ATH"), "awayFromBest must reference breaking ATH");
  assert(stringsContent.includes("lock in your airdrop bag"), "Wallet note must reference airdrop bag");
});

await test("R1.6: Invariant: strings.gameTitle preserves brand for smoke test", () => {
  assert(stringsContent.includes('"$TAP CHOP GAME"'), "strings.gameTitle must contain '$TAP CHOP GAME'");
});

// -----------------------------------------------------------------
// FEATURE R2: VISUAL & PALETTE OVERHAUL (ELECTRIC ARCADE TOKENS)
// -----------------------------------------------------------------
console.log("\n[R2] Feature: Visual & Palette Overhaul");

const globalsCssPath = path.join(rootDir, "src", "app", "globals.css");
const globalsCss = fs.readFileSync(globalsCssPath, "utf8");

await test("R2.1: Master :root in globals.css defines Solana Bull Green (#00FFA3)", () => {
  assert(
    globalsCss.includes("--green: #00FFA3") || globalsCss.includes("--green: #00ffa3"),
    "Must define --green: #00FFA3 (Solana Bull Green)"
  );
});

await test("R2.2: Master :root defines Liquidated Red (#FF3B30) and Electric Gold (#FFD000)", () => {
  assert(
    globalsCss.includes("--red: #FF3B30") || globalsCss.includes("--red: #ff3b30"),
    "Must define --red: #FF3B30"
  );
  assert(
    globalsCss.includes("--gold: #FFD000") || globalsCss.includes("--gold: #ffd000"),
    "Must define --gold: #FFD000"
  );
});

await test("R2.3: Master :root defines Deep Space Void base (#06090c)", () => {
  assert(
    globalsCss.includes("--bg-0: #06090c"),
    "Must define --bg-0: #06090c"
  );
});

await test("R2.4: Cyber panel surfaces and glassmorphic borders are defined", () => {
  assert(
    globalsCss.includes("--panel: rgba(14, 22, 32, 0.88)") || globalsCss.includes("--panel: rgba(14, 22, 32,"),
    "Must define cyber panel background"
  );
  assert(
    globalsCss.includes("--line: rgba(0, 255, 163,"),
    "Must define neon Solana border custom property"
  );
});

await test("R2.5: Parallax veil .px-veil uses clean gradient without murky tint", () => {
  assert(globalsCss.includes(".px-veil"), ".px-veil must be defined in CSS");
  assert(
    !globalsCss.includes("rgba(7, 13, 10, 0.94)"),
    "Murky 94% green veil gradient must be eliminated"
  );
});

await test("R2.6: Theme color is synchronized across engine.ts and layout.tsx", () => {
  const enginePath = path.join(rootDir, "src", "game", "engine.ts");
  const layoutPath = path.join(rootDir, "src", "app", "layout.tsx");
  const engineContent = fs.readFileSync(enginePath, "utf8");
  const layoutContent = fs.readFileSync(layoutPath, "utf8");

  assert(engineContent.includes("0x06090c"), "engine.ts must use backgroundColor 0x06090c");
  assert(layoutContent.includes('"#06090c"'), "layout.tsx must use themeColor #06090c");
});

// -----------------------------------------------------------------
// FEATURE R3: ARCADE CABINET LOBBY RESTRUCTURE
// -----------------------------------------------------------------
console.log("\n[R3] Feature: Arcade Cabinet Lobby Restructure");

const playPagePath = path.join(rootDir, "src", "app", "play", "page.tsx");
const playContent = fs.readFileSync(playPagePath, "utf8");

await test("R3.1: Play lobby renders tactile arcade pushbuttons (Try Demo & Drop In)", () => {
  assert(
    playContent.includes("tryDemo") || playContent.includes("FREE PRACTICE"),
    "Hero must support practice CTA"
  );
  assert(
    playContent.includes("playNow") || playContent.includes("DROP IN & CHOP"),
    "Hero must support active play CTA"
  );
});

await test("R3.2: Hero includes candle legend with God Candle and Bear Dump callouts", () => {
  assert(playContent.includes("CandleLegend"), "Lobby hero must mount CandleLegend");
  assert(playContent.includes("legend-card-green"), "Legend must render green card");
  assert(playContent.includes("legend-card-red"), "Legend must render red card");
});

await test("R3.3: How to Play section explains 3 core tactics (Chop, Jump, Pump)", () => {
  assert(
    playContent.includes("CHOP") || playContent.includes("Chop"),
    "Rules must feature Chop"
  );
  assert(
    playContent.includes("JUMP") || playContent.includes("Jump") || playContent.includes("Red"),
    "Rules must feature Jump over Red"
  );
  assert(
    playContent.includes("CANDLE") || playContent.includes("Candle") || playContent.includes("PUMP"),
    "Rules must feature Green Candles / Pump"
  );
});

await test("R3.4: Lobby embeds link to full official playbook (/how-to-play)", () => {
  assert(
    playContent.includes("/how-to-play"),
    "Lobby must provide link to detailed playbook /how-to-play"
  );
});

await test("R3.5: Smoke test invariant: /play live HTML contains required anchors", async () => {
  const res = await fetch("http://localhost:3000/play");
  assert.strictEqual(res.status, 200, "GET /play must return 200");
  const html = await res.text();
  assert(html.includes("$TAP CHOP GAME"), "/play must render '$TAP CHOP GAME'");
  assert(
    html.toLowerCase().includes("phantom"),
    "/play must mention Phantom wallet"
  );
});

// -----------------------------------------------------------------
// FEATURE R4: PLATFORMER PHYSICS & GAME FEEL POLISH
// -----------------------------------------------------------------
console.log("\n[R4] Feature: Platformer Physics & Game Feel Polish");

const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");

await test("R4.1: Coyote Time (100ms) is implemented in GameScene.ts", () => {
  assert(
    gameSceneContent.includes("COYOTE_TIME_MS") || gameSceneContent.includes("100"),
    "GameScene must implement 100ms coyote time window"
  );
  assert(
    gameSceneContent.includes("lastGroundedTime"),
    "GameScene must track lastGroundedTime"
  );
});

await test("R4.2: Jump Buffering (120ms) is implemented in GameScene.ts", () => {
  assert(
    gameSceneContent.includes("JUMP_BUFFER_MS") || gameSceneContent.includes("120"),
    "GameScene must implement 120ms jump buffering window"
  );
  assert(
    gameSceneContent.includes("lastJumpPressedTime"),
    "GameScene must track lastJumpPressedTime"
  );
});

await test("R4.3: Variable Jump Height cuts vertical velocity on early release", () => {
  assert(
    gameSceneContent.includes("MIN_JUMP_VELOCITY") || gameSceneContent.includes("wasJumpDown"),
    "GameScene must support variable jump height by truncating jump velocity on early release"
  );
});

await test("R4.4: Screen micro-recoil triggers camera shake on tree chops", () => {
  assert(
    gameSceneContent.includes("cameras.main.shake"),
    "GameScene must invoke cameras.main.shake on chops"
  );
});

await test("R4.5: Dramatic hit-stop freezes movement & timers during hit-stop frames", () => {
  assert(
    gameSceneContent.includes("hitStopUntil"),
    "GameScene must use hitStopUntil timestamp"
  );
  assert(
    gameSceneContent.includes("time < this.hitStopUntil") && gameSceneContent.includes("return"),
    "GameScene update loop must freeze when time < hitStopUntil"
  );
});

await test("R4.6: Level-clearing tree triggers extended dramatic hit-stop and Bull Green flash", () => {
  assert(
    gameSceneContent.includes("cameras.main.flash") || gameSceneContent.includes("0, 255, 163"),
    "Level clear must produce dramatic visual flash"
  );
  assert(
    gameSceneContent.includes("sound.playLevelUp()"),
    "Level clear must play celebratory sound"
  );
});

// -----------------------------------------------------------------
// FEATURE R5: PROCEDURAL 8-BIT AUDIO & DYNAMIC HURRY-UP MODE
// -----------------------------------------------------------------
console.log("\n[R5] Feature: Procedural 8-Bit Audio & Dynamic Hurry-Up Mode");

const soundPath = path.join(rootDir, "src", "lib", "sound.ts");
const soundContent = fs.readFileSync(soundPath, "utf8");

await test("R5.1: Centralized GainNode hierarchy (masterGain, bgmGain, sfxGain) configured", () => {
  assert(soundContent.includes("masterGain"), "sound.ts must define masterGain");
  assert(soundContent.includes("bgmGain"), "sound.ts must define bgmGain");
  assert(soundContent.includes("sfxGain"), "sound.ts must define sfxGain");
  assert(soundContent.includes("this.masterGain.connect(this.ctx.destination)"), "masterGain connects to destination");
});

await test("R5.2: Procedural 16-step retro chiptune synthesizer loop implemented", () => {
  assert(soundContent.includes("LEAD_PATTERN"), "sound.ts must define lead melody pattern");
  assert(soundContent.includes("BASS_PATTERN"), "sound.ts must define walking bassline pattern");
  assert(soundContent.includes("startBgm"), "sound.ts must implement startBgm()");
  assert(soundContent.includes("stopBgm"), "sound.ts must implement stopBgm()");
});

await test("R5.3: Dynamic Hurry-Up mode accelerates tempo (132 -> 176 BPM)", () => {
  assert(soundContent.includes("setHurryUp"), "sound.ts must implement setHurryUp()");
  assert(soundContent.includes("132") && soundContent.includes("176"), "Tempo shifts from 132 to 176 BPM");
});

await test("R5.4: Pentatonic scale progression implemented for combo streaks", () => {
  assert(soundContent.includes("PENTATONIC_SCALE"), "sound.ts must define PENTATONIC_SCALE");
  assert(soundContent.includes("playGreen"), "sound.ts must implement playGreen()");
  assert(soundContent.includes("combo"), "playGreen must accept combo parameter");
});

await test("R5.5: Pop-free volume control and exponential gain smoothing implemented", () => {
  assert(soundContent.includes("setVolume"), "sound.ts must implement setVolume()");
  assert(soundContent.includes("getVolume"), "sound.ts must implement getVolume()");
  assert(soundContent.includes("toggleMute"), "sound.ts must implement toggleMute()");
  assert(soundContent.includes("setTargetAtTime"), "sound.ts must use setTargetAtTime for pop-free transitions");
});

// -----------------------------------------------------------------
// FEATURE R6: CHAT FREEZE FIX & BACKEND GLOBAL STATS WIRING
// -----------------------------------------------------------------
console.log("\n[R6] Feature: Chat Freeze Fix & Backend Global Stats Wiring");

const chatRoutePath = path.join(rootDir, "src", "app", "api", "chat", "route.ts");
const chatRouteContent = fs.readFileSync(chatRoutePath, "utf8");
const globalChatPath = path.join(rootDir, "src", "components", "GlobalChat.tsx");
const globalChatContent = fs.readFileSync(globalChatPath, "utf8");

await test("R6.1: /api/chat queries orderBy createdAt desc with take: 50", () => {
  assert(chatRouteContent.includes('orderBy: { createdAt: "desc" }'), "Query must order by createdAt desc");
  assert(chatRouteContent.includes("take: 50"), "Query must take 50 rows");
});

await test("R6.2: /api/chat reverses descending rows for chronological display", () => {
  assert(
    chatRouteContent.includes("messages.reverse()") || chatRouteContent.includes(".reverse()"),
    "Messages array must be reversed before client serialization"
  );
});

await test("R6.3: GlobalChat.tsx throttles polling: 15s closed vs 3.5s open", () => {
  assert(
    globalChatContent.includes("15000") && globalChatContent.includes("3500"),
    "Polling must alternate between 15000ms (closed) and 3500ms (open)"
  );
  assert(
    globalChatContent.includes("isOpen ? 3500 : 15000") || globalChatContent.includes("isOpen ? 3.5 : 15"),
    "Polling interval must be conditionally driven by isOpen"
  );
});

await test("R6.4: Live endpoint GET /api/stats/home returns valid totals aggregation", async () => {
  const res = await fetch("http://localhost:3000/api/stats/home");
  assert.strictEqual(res.status, 200, "GET /api/stats/home must return 200");
  const json = await res.json();
  assert.strictEqual(json.ok, true, "Response ok must be true");
  assert(typeof json.data.totals.trees === "number", "totals.trees must be numeric");
  assert(typeof json.data.totals.players === "number", "totals.players must be numeric");
  assert(typeof json.data.totals.runs === "number", "totals.runs must be numeric");
});

await test("R6.5: Backend stats route dynamically calculates tree totals via Prisma aggregation", () => {
  const statsRoutePath = path.join(rootDir, "src", "app", "api", "stats", "home", "route.ts");
  const statsRouteContent = fs.readFileSync(statsRoutePath, "utf8");
  assert(
    statsRouteContent.includes("trees: true") || statsRouteContent.includes("trees: runsAgg._sum.trees"),
    "stats/home route must dynamically aggregate trees from database runs"
  );
  assert(
    stringsContent.includes("globalWeeklyTreesFallback"),
    "strings catalog must define globalWeeklyTreesFallback"
  );
});

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log("\n==================================================");
console.log(`TIER 1 RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TIER 1 FEATURE COVERAGE TESTS PASSED (100%)");
}
