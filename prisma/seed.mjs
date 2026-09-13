import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO !== "true" || process.env.NODE_ENV === "production") {
    throw new Error("Demo seed is disabled. Set SEED_DEMO=true in a non-production environment to continue.");
  }

  const now = Date.now();
  const admin = await db.user.upsert({
    where: { username: "LocalAdmin" },
    update: { role: "admin", status: "active" },
    create: { username: "LocalAdmin", role: "admin", status: "active", isGuest: true },
  });

  await db.competition.create({
    data: {
      gameSlug: "tap-chimp",
      name: "Local Development Chop",
      description: "Development-only competition. Never created in production.",
      rules: "Best single valid run counts.",
      status: "live",
      startsAt: new Date(now - 60 * 60 * 1000),
      endsAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      rewardJson: "{}",
      createdById: admin.id,
    },
  });

  console.log("Development seed completed.");
}

main().finally(() => db.$disconnect());
