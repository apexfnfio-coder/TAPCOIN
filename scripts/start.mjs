import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, "utf8");
  if (isPostgres) {
    console.log("→ [start] PostgreSQL detected. Adapting schema provider to postgresql...");
    schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  } else {
    schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  }
  fs.writeFileSync(schemaPath, schemaContent, "utf8");
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

// Ensure database tables exist at runtime on Railway
console.log("→ [start] Checking database status...");
try {
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", env });
} catch (err) {
  console.warn("⚠️ Database check notice:", err?.message || err);
}

// Seed initial starter runs if needed
try {
  execSync("node prisma/seed.mjs", { stdio: "inherit", env });
} catch (err) {
  // Non-fatal
}

const port = process.env.PORT || 3000;
console.log(`→ [start] Launching Next.js on 0.0.0.0:${port}...`);

const nextProc = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", String(port)], {
  stdio: "inherit",
  env,
  shell: true,
});

nextProc.on("exit", (code) => {
  process.exit(code || 0);
});
