import { execSync } from "child_process";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

console.log("→ [build] Setting up database with:", databaseUrl);
try {
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", env });
} catch (err) {
  console.warn("⚠️ Database setup notice:", err?.message || err);
}

console.log("→ [build] Building Next.js production app...");
try {
  execSync("npx --no-install next build", { stdio: "inherit", env });
} catch {
  execSync("npx next build", { stdio: "inherit", env });
}
