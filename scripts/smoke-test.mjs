import http from "node:http";

const routes = [
  { path: "/api/health", expectedCode: 200, check: (body) => body.includes('"status":"ok"') },
  { path: "/play", expectedCode: 200, check: (body) => body.includes("$TAP CHOP GAME") && (body.includes("Phantom") || body.includes("phantom")) },
  { path: "/how-to-play", expectedCode: 200, check: (body) => body.includes("How to Play") && body.includes("Solana") },
  { path: "/leaderboard", expectedCode: 200, check: (body) => body.includes("LEADERBOARD") || body.includes("Leaderboard") },
  { path: "/buy", expectedCode: 200, check: (body) => body.includes("BUY $TAP") || body.includes("Jupiter") },
  { path: "/profile", expectedCode: 200, check: (body) => body.includes("profile") || body.includes("Profile") },
  { path: "/api/stats/home", expectedCode: 200, check: (body) => body.includes('"totals"') && body.includes('"trees"') },
  { path: "/api/chat", expectedCode: 200, check: (body) => body.includes('"messages"') },
];

console.log("==================================================");
console.log("  PRODUCTION LIVE HTTP SMOKE TEST (PORT 3000)     ");
console.log("==================================================");

let failed = 0;

async function checkRoute({ path, expectedCode, check }) {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const ms = Date.now() - start;
        const codeOk = res.statusCode === expectedCode;
        const bodyOk = !check || check(data);
        if (codeOk && bodyOk) {
          console.log(`  ✓ [${res.statusCode}] ${path} (${ms}ms)`);
        } else {
          console.error(`  ✗ [${res.statusCode}] ${path} (${ms}ms) - Failed expectations`);
          failed++;
        }
        resolve();
      });
    });
    req.on("error", (err) => {
      console.error(`  ✗ [ERR] ${path}: ${err.message}`);
      failed++;
      resolve();
    });
  });
}

async function run() {
  for (const route of routes) {
    await checkRoute(route);
  }
  console.log("==================================================");
  if (failed === 0) {
    console.log(`ALL LIVE SMOKE TESTS PASSED (${routes.length}/${routes.length} HEALTHY)`);
    process.exit(0);
  } else {
    console.error(`${failed} SMOKE TESTS FAILED`);
    process.exit(1);
  }
}

run();
