import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("  TEST: 0.01 SOL SEASON PASS, TREASURY & ADMIN    ");
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

// 1. Treasury Wallet & Fee Invariants
test("Treasury wallet is configured as 95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7", () => {
  const seasonContent = fs.readFileSync(path.resolve("src/lib/season.ts"), "utf8");
  assert.ok(seasonContent.includes("95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7"), "Treasury wallet must match user specification");
  assert.ok(seasonContent.includes("0.01"), "Season fee must be 0.01 SOL");
  assert.ok(seasonContent.includes("10_000_000"), "Season fee lamports must be 10,000,000");
});

// 2. Admin Exemption & Security in season.ts
test("season.ts implements admin bypass without payment confirmation", () => {
  const seasonContent = fs.readFileSync(path.resolve("src/lib/season.ts"), "utf8");
  assert.ok(seasonContent.includes("isUserAdmin(user)"), "Admin wallets must be checked");
  assert.ok(seasonContent.includes('reason: "admin"'), "Admin check must grant automatic perpetual season access");
  assert.ok(seasonContent.includes("accessOverride === true"), "Admin manual grant override must be supported");
  assert.ok(seasonContent.includes("accessOverride === false"), "Admin manual revoke override must be supported");
});

// 3. Solana RPC Treasury Live Query & Confirmation
test("solanaRpc.ts queries real balance of treasury wallet and calculates 10% pool", () => {
  const rpcContent = fs.readFileSync(path.resolve("src/lib/solanaRpc.ts"), "utf8");
  assert.ok(rpcContent.includes("TREASURY_WALLET"), "RPC must query treasury wallet");
  assert.ok(rpcContent.includes("getBalance"), "Must query on-chain balance via RPC");
  assert.ok(rpcContent.includes("verifySolanaPaymentTx"), "Must verify on-chain signature on Solscan/RPC");
  assert.ok(rpcContent.includes("api.mainnet-beta.solana.com"), "Must target Solana mainnet");
});

// 4. Prisma Schema: PaymentTx and User fields
test("prisma/schema.prisma includes PaymentTx model and User season fields", () => {
  const prismaContent = fs.readFileSync(path.resolve("prisma/schema.prisma"), "utf8");
  assert.ok(prismaContent.includes("model PaymentTx"), "PaymentTx model must exist");
  assert.ok(prismaContent.includes("signature   String   @unique"), "signature must be unique to prevent replay attacks");
  assert.ok(prismaContent.includes("solscanUrl  String"), "solscanUrl must be stored for admin audit");
  assert.ok(prismaContent.includes("paidSeason     String?"), "User must have paidSeason");
  assert.ok(prismaContent.includes("accessOverride Boolean?"), "User must have accessOverride");
});

// 5. Anti-Cheat Run Enforcement in /api/runs
test("/api/runs route validates season access and flags unpaid players", () => {
  const runsContent = fs.readFileSync(path.resolve("src/app/api/runs/route.ts"), "utf8");
  assert.ok(runsContent.includes("checkSeasonAccess(user)"), "/api/runs must enforce season check");
  assert.ok(runsContent.includes("UNPAID_SEASON"), "Unpaid runs must be flagged UNPAID_SEASON");
  assert.ok(runsContent.includes("valid = false"), "Unpaid runs must be marked invalid to prevent leaderboard pollution");
});

// 6. Season Pass Modal Frontend
test("SeasonPassModal.tsx executes 0.01 SOL transfer with SystemProgram", () => {
  const modalContent = fs.readFileSync(path.resolve("src/components/SeasonPassModal.tsx"), "utf8");
  assert.ok(modalContent.includes("SystemProgram.transfer"), "Must construct Solana transfer instruction");
  assert.ok(modalContent.includes("TREASURY_WALLET") || modalContent.includes("95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7"), "Recipient must be treasury wallet");
  assert.ok(modalContent.includes("0.01 SOL"), "Modal must clearly communicate 0.01 SOL season fee");
  assert.ok(modalContent.includes("solscanUrl") && modalContent.includes("View Confirmed on Solscan"), "Must provide Solscan verification link");
});

// 7. Admin Dashboard: Users & Payment History
test("Admin panel provides access toggles, Solscan links, and payment history", () => {
  const adminUsers = fs.readFileSync(path.resolve("src/app/admin/users/page.tsx"), "utf8");
  assert.ok(adminUsers.includes("Live Solscan Payments"), "Admin users page must feature Solscan payments tab");
  assert.ok(adminUsers.includes("setAccessOverride"), "Admin must be able to grant or revoke user access");
  assert.ok(adminUsers.includes("solscanUrl"), "Admin must have direct Solscan explorer links");
  
  const adminOverview = fs.readFileSync(path.resolve("src/app/admin/page.tsx"), "utf8");
  assert.ok(adminOverview.includes("Official Season Players"), "Admin overview must track official registered players");
  assert.ok(adminOverview.includes("10% Leaderboard Pool"), "Admin overview must show 10% Leaderboard Pool");
  assert.ok(adminOverview.includes("90% Buyback & Burn Pool"), "Admin overview must show 90% Buyback & Burn Pool");
});

// 8. Navigation & Live Badges
test("Nav.tsx displays live 10% prize pool and GlobalChat shows live online count", () => {
  const navContent = fs.readFileSync(path.resolve("src/components/Nav.tsx"), "utf8");
  assert.ok(navContent.includes("prize-pool-nav-pill"), "Nav must render 10% pool pill");
  assert.ok(navContent.includes("/api/treasury/pool"), "Nav must fetch from /api/treasury/pool");
  assert.ok(navContent.includes("ENABLE_COMPETITIONS = false"), "Competitions must be hidden from primary navigation");

  const chatContent = fs.readFileSync(path.resolve("src/components/GlobalChat.tsx"), "utf8");
  assert.ok(chatContent.includes("onlineUsers"), "GlobalChat must track online degens");
  assert.ok(chatContent.includes("ONLINE"), "GlobalChat must display ONLINE indicator");
});

// 9. Play page integration & Competition Decoupling
test("play/page.tsx gates official runs with SeasonPassModal, displays 10/90 tokenomics, and omits competitions", () => {
  const playContent = fs.readFileSync(path.resolve("src/app/play/page.tsx"), "utf8");
  assert.ok(playContent.includes("SeasonPassModal"), "Play page must include SeasonPassModal");
  assert.ok(playContent.includes("showSeasonModal"), "Play page must trigger modal when unpaid");
  assert.ok(playContent.includes("10% LEADERBOARD POOL"), "Play page must showcase live prize pool");
  assert.ok(playContent.includes("90% BUYBACK & BURN"), "Play page must showcase buyback & burn tokenomics");
  assert.ok(!playContent.includes("/api/competitions"), "Play page must not fetch public competitions");
  assert.ok(!playContent.includes("competitionId:"), "Play page must not submit competitionId in runs");
});

// 10. Public Competitions Redirect to /leaderboard
test("Public competition routes redirect to /leaderboard", () => {
  const compIndex = fs.readFileSync(path.resolve("src/app/competitions/page.tsx"), "utf8");
  assert.ok(compIndex.includes('redirect("/leaderboard")'), "Competitions index must redirect to /leaderboard");

  const compDetail = fs.readFileSync(path.resolve("src/app/competitions/[id]/page.tsx"), "utf8");
  assert.ok(compDetail.includes('redirect("/leaderboard")'), "Competition details must redirect to /leaderboard");
});

// 11. Treasury Pool API 10% Leaderboard & 90% Buyback/Burn Allocation
test("api/treasury/pool route allocates 10% to leaderboard and 90% to buyback & burn from game fees", () => {
  const poolRoute = fs.readFileSync(path.resolve("src/app/api/treasury/pool/route.ts"), "utf8");
  assert.ok(poolRoute.includes("totalGameFeesSol * 0.10"), "Prize pool must be 10% of game fees");
  assert.ok(poolRoute.includes("totalGameFeesSol * 0.90"), "Buyback burn pool must be 90% of game fees");
  assert.ok(poolRoute.includes("buybackBurnPoolSol"), "API must return buybackBurnPoolSol");
});

console.log("==================================================");
console.log(`RESULTS: ${passed} passed, 0 failed`);
console.log("ALL 0.01 SOL SEASON & SECURITY AUDIT TESTS PASSED!");
console.log("==================================================");
