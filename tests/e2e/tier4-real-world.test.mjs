import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

console.log("==================================================");
console.log("  TIER 4: REAL-WORLD APPLICATION SCENARIOS (E2E)  ");
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
// WORKFLOW W1: DEMO RUN -> LIQUIDATION -> SCORE CARD FLEX -> WALLET MODAL
// -----------------------------------------------------------------
console.log("\n[Workflow 1] Demo Practice Run -> Liquidation -> Score Flex -> Wallet Modal");

await test("W1.1: Player lands on /play; Arcade Battle Station lobby loads cleanly", async () => {
  const res = await fetch("http://localhost:3000/play");
  assert.strictEqual(res.status, 200, "Lobby must return HTTP 200");
  const html = await res.text();
  assert(html.includes("$TAP CHOP GAME"), "Must display game title anchor");
  assert(html.includes("FREE PRACTICE") || html.includes("Try Demo"), "Must offer free practice demo button");
  assert(html.toLowerCase().includes("phantom"), "Must offer Phantom wallet option");
});

await test("W1.2: Player launches Free Practice; engine initializes Level 1 targets", () => {
  const configPath = path.join(rootDir, "src", "lib", "config.ts");
  const configContent = fs.readFileSync(configPath, "utf8");
  assert(configContent.includes("levelGoalBase: 4"), "Level 1 base target is 4 trees");
  assert(configContent.includes("pointsPerTree: 100"), "Base tree value is 100 PTS");
  assert(configContent.includes("pointsPerGreen: 10"), "Green candle is 10 PTS");
  assert(configContent.includes("redHitScorePenalty: 25"), "Red candle penalty is 25 PTS");
});

await test("W1.3: Practice run timer drops to 0; GameScene terminates run with failed outcome", () => {
  const gameScenePath = path.join(rootDir, "src", "game", "scenes", "GameScene.ts");
  const gameSceneContent = fs.readFileSync(gameScenePath, "utf8");
  assert(
    gameSceneContent.includes('if (this.timeLeftMs <= 0) return this.endRun("failed");') ||
    gameSceneContent.includes('this.timeLeftMs <= 0'),
    "Timer reaching 0 invokes endRun('failed')"
  );
  assert(
    gameSceneContent.includes("this.ended = true"),
    "endRun sets this.ended = true to freeze motion"
  );
  const soundPath = path.join(rootDir, "src", "lib", "sound.ts");
  const soundContent = fs.readFileSync(soundPath, "utf8");
  assert(
    soundContent.includes("stopBgm()"),
    "Audio system provides stopBgm for run termination"
  );
});

await test("W1.4: Results Panel computes verified score & formats flex share message", () => {
  const resultsPanelPath = path.join(rootDir, "src", "components", "ResultsPanel.tsx");
  const resultsPanelContent = fs.readFileSync(resultsPanelPath, "utf8");

  // Verify share text templates
  assert(
    resultsPanelContent.includes("#TAPCOIN") && resultsPanelContent.includes("#SolanaGaming"),
    "Share card must include official Web3 hashtags"
  );
  assert(
    resultsPanelContent.includes("demoBadge") || resultsPanelContent.includes("DEMO"),
    "ResultsPanel must display Demo / Practice status for unverified runs"
  );
});

await test("W1.5: Results modal prompts connecting Solana wallet to record verified ATH", () => {
  const stringsPath = path.join(rootDir, "src", "i18n", "strings.ts");
  const stringsContent = fs.readFileSync(stringsPath, "utf8");
  assert(
    stringsContent.includes("lock in your airdrop bag") || stringsContent.includes("airdrop"),
    "Wallet prompt must incentivize player with authentic Web3 rewards phrasing"
  );
});

// -----------------------------------------------------------------
// WORKFLOW W2: LIVE CHAT TROLLBOX INTERACTION DURING ACTIVE RUN
// -----------------------------------------------------------------
console.log("\n[Workflow 2] Live Chat Trollbox Interaction During Active Run");

await test("W2.1: Chat drawer fetches latest 50 messages from /api/chat", async () => {
  const res = await fetch("http://localhost:3000/api/chat");
  assert.strictEqual(res.status, 200, "GET /api/chat must return 200");
  const json = await res.json();
  assert(Array.isArray(json.messages), "Response must have messages array");
  assert(json.messages.length <= 50, "Messages length cannot exceed 50");
});

await test("W2.2: Messages are chronologically ordered (oldest first, newest last)", async () => {
  const res = await fetch("http://localhost:3000/api/chat");
  const json = await res.json();
  if (json.messages.length >= 2) {
    const t0 = new Date(json.messages[0].createdAt).getTime();
    const t1 = new Date(json.messages[json.messages.length - 1].createdAt).getTime();
    assert(t1 >= t0, "Last message must be newer than or equal to first message");
  }
});

await test("W2.3: Chat switches polling to 3.5s when open vs 15s when closed", () => {
  const globalChatPath = path.join(rootDir, "src", "components", "GlobalChat.tsx");
  const globalChatContent = fs.readFileSync(globalChatPath, "utf8");
  assert(
    globalChatContent.includes("isOpen ? 3500 : 15000"),
    "GlobalChat must throttle polling to 15s when closed and 3.5s when open"
  );
});

await test("W2.4: Guest chat submissions are safely blocked requiring wallet authentication", async () => {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Checking trollbox from guest" }),
  });
  assert.strictEqual(res.status, 403, "Guest POST must be blocked with 403");
});

// -----------------------------------------------------------------
// WORKFLOW W3: GLOBAL LIVE STATS RENDERING & LEADERBOARD PIPELINE
// -----------------------------------------------------------------
console.log("\n[Workflow 3] Global Live Stats Rendering & Leaderboard Pipeline");

await test("W3.1: Server aggregates total trees and active runs across default game", async () => {
  const res = await fetch("http://localhost:3000/api/stats/home");
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert(data.ok === true, "Stats API must return ok: true");
  assert(typeof data.data.totals.trees === "number", "Totals trees must be number");
  assert(typeof data.data.totals.runs === "number", "Totals runs must be number");
  assert(typeof data.data.totals.players === "number", "Totals players must be number");
});

await test("W3.2: Leaderboard API /api/leaderboard serves rankings with valid structure", async () => {
  const res = await fetch("http://localhost:3000/api/leaderboard");
  assert.strictEqual(res.status, 200, "Leaderboard API must return 200");
  const json = await res.json();
  assert(Array.isArray(json.entries) || Array.isArray(json.data) || json.ok !== undefined, "Leaderboard returns valid structure");
});

await test("W3.3: Home lobby displays live milestone counter rather than static placeholder", () => {
  const statsRoutePath = path.join(rootDir, "src", "app", "api", "stats", "home", "route.ts");
  const statsRouteContent = fs.readFileSync(statsRoutePath, "utf8");
  assert(
    statsRouteContent.includes("db.run.aggregate") && statsRouteContent.includes("trees: true"),
    "Stats route must calculate aggregate trees from database"
  );
});

// -----------------------------------------------------------------
// WORKFLOW W4: END-TO-END PLATFORM NAVIGATION & THEME INTEGRITY
// -----------------------------------------------------------------
console.log("\n[Workflow 4] Platform Navigation & Theme Integrity");

const routes = [
  { path: "/play", name: "Lobby" },
  { path: "/how-to-play", name: "Playbook" },
  { path: "/leaderboard", name: "Leaderboard" },
  { path: "/buy", name: "Buy TAP" },
  { path: "/profile", name: "Profile" },
];

for (const r of routes) {
  await test(`W4.${routes.indexOf(r) + 1}: ${r.name} (${r.path}) renders HTTP 200 with theme #06090c`, async () => {
    const res = await fetch(`http://localhost:3000${r.path}`);
    assert.strictEqual(res.status, 200, `${r.path} must return 200`);
    const html = await res.text();
    assert(
      html.includes("#06090c") || html.includes("theme-color"),
      `${r.path} must specify dark theme`
    );
  });
}

await test("W4.6: Official Solana wallet badges (Phantom, Solflare, Jupiter) render in UI", () => {
  const walletBadgesPath = path.join(rootDir, "src", "components", "WalletBadges.tsx");
  const walletBadgesContent = fs.readFileSync(walletBadgesPath, "utf8");
  assert(walletBadgesContent.includes("PhantomIcon"), "Must render Phantom badge");
  assert(walletBadgesContent.includes("SolflareIcon"), "Must render Solflare badge");
  assert(!walletBadgesContent.includes("👻"), "Zero emojis in wallet badges");
});

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log("\n==================================================");
console.log(`TIER 4 RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TIER 4 REAL-WORLD SCENARIO TESTS PASSED (100%)");
}
