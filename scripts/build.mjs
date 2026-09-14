import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, "utf8");
  if (isPostgres) {
    console.log("→ [build] PostgreSQL detected. Adapting schema provider to postgresql...");
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

console.log("→ [build] Generating Prisma client...");
try {
  execSync("npx prisma generate", { stdio: "inherit", env });
} catch (err) {
  console.warn("⚠️ Prisma generate notice:", err?.message || err);
}

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
