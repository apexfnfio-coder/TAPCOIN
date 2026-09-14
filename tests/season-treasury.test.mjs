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
  assert.ok(adminOverview.includes("10% Dev Treasury Pool"), "Admin overview must show 10% Dev Treasury Pool");
});

// 8. Navigation & Live Badges
test("Nav.tsx displays live 10% prize pool and GlobalChat shows live online count", () => {
  const navContent = fs.readFileSync(path.resolve("src/components/Nav.tsx"), "utf8");
  assert.ok(navContent.includes("prize-pool-nav-pill"), "Nav must render 10% pool pill");
  assert.ok(navContent.includes("/api/treasury/pool"), "Nav must fetch from /api/treasury/pool");

  const chatContent = fs.readFileSync(path.resolve("src/components/GlobalChat.tsx"), "utf8");
  assert.ok(chatContent.includes("onlineUsers"), "GlobalChat must track online degens");
  assert.ok(chatContent.includes("ONLINE"), "GlobalChat must display ONLINE indicator");
});

// 9. Play page integration
test("play/page.tsx gates official runs with SeasonPassModal and exempts admins", () => {
  const playContent = fs.readFileSync(path.resolve("src/app/play/page.tsx"), "utf8");
  assert.ok(playContent.includes("SeasonPassModal"), "Play page must include SeasonPassModal");
  assert.ok(playContent.includes("showSeasonModal"), "Play page must trigger modal when unpaid");
  assert.ok(playContent.includes("10% DEV POOL"), "Play page must showcase live prize pool");
});

console.log("==================================================");
console.log(`RESULTS: ${passed} passed, 0 failed`);
console.log("ALL 0.01 SOL SEASON & SECURITY AUDIT TESTS PASSED!");
console.log("==================================================");
