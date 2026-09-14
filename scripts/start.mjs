import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, "utf8");
  if (isPostgres && schemaContent.includes('provider = "sqlite"')) {
    console.log("→ [start] PostgreSQL detected. Adapting schema provider to postgresql...");
    schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schemaContent, "utf8");
    try {
      execSync("node node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate", { stdio: "inherit", env: process.env });
    } catch (err) {
      console.warn("⚠️ Database setup notice:", err?.message || err);
    }
  }
}

// Initialize SQLite if database file doesn't exist yet
const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const legacyDbPath = path.join(process.cwd(), "dev.db");
if (!isPostgres && !fs.existsSync(dbPath) && !fs.existsSync(legacyDbPath)) {
  console.log("→ [start] Initializing SQLite database schema...");
  try {
    execSync("node node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate", { stdio: "inherit", env: process.env });
  } catch (err) {
    console.warn("⚠️ Database check notice:", err?.message || err);
  }
}

// Seed initial starter runs if needed (only in development with SEED_DEMO)
if (process.env.SEED_DEMO === "true" && process.env.NODE_ENV !== "production") {
  try {
    execSync("node prisma/seed.mjs", { stdio: "inherit" });
  } catch {
    // Non-fatal
  }
}

const port = process.env.PORT || 3000;
console.log(`→ [start] Launching Next.js on 0.0.0.0:${port}...`);

// Spawn Next.js binary directly using Node (bypasses slow npx and avoids shell wrapping)
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const nextProc = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", String(port)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "0.0.0.0",
  },
});

nextProc.on("exit", (code) => {
  process.exit(code || 0);
});

process.on("SIGTERM", () => nextProc.kill("SIGTERM"));
process.on("SIGINT", () => nextProc.kill("SIGINT"));
