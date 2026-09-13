import { execSync } from "child_process";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

console.log("→ [build] Setting up database with:", databaseUrl);
execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", env });

console.log("→ [build] Building Next.js production app...");
execSync("npx next build", { stdio: "inherit", env });
