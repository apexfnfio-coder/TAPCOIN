import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/hub";
import { DEFAULT_GAME_SLUG, isKnownGameSlug } from "@/modules/games/core/game-registry";

export async function GET() {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const comps = await db.competition.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { entries: true, runs: true } } },
  });
  return ok({
    competitions: comps.map((c) => ({
      id: c.id, gameSlug: c.gameSlug, name: c.name, description: c.description, rules: c.rules,
      status: c.status, startsAt: c.startsAt.toISOString(), endsAt: c.endsAt.toISOString(),
      rewards: JSON.parse(c.rewardJson || "{}"), participants: c._count.entries, runs: c._count.runs,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

const Create = z.object({
  gameSlug: z.string().optional().default(DEFAULT_GAME_SLUG).refine(isKnownGameSlug, "Unknown game module"),
  name: z.string().min(3).max(60),
  description: z.string().max(500).default(""),
  rules: z.string().max(1000).default(""),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  rewards: z.record(z.union([z.string(), z.number()])).default({}),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const ip = clientIp(req);

  let body: z.infer<typeof Create>;
  try {
    body = Create.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Malformed competition payload.");
  }
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (endsAt <= startsAt) return fail(400, "BAD_WINDOW", "End time must be after start time.");

  const now = new Date();
  const status = endsAt <= now ? "ended" : startsAt <= now ? "live" : "scheduled";

  const comp = await db.competition.create({
    data: {
      gameSlug: body.gameSlug,
      name: body.name,
      description: body.description,
      rules: body.rules,
      startsAt,
      endsAt,
      status,
      rewardJson: JSON.stringify(body.rewards),
      createdById: auth.user.id,
    },
  });
  await audit("ADMIN_COMPETITION_CREATED", { actorId: auth.user.id, target: comp.id, meta: { name: comp.name, gameSlug: comp.gameSlug }, ip });
  publish("competitions", { type: "changed", gameSlug: comp.gameSlug });
  return ok({ competition: { id: comp.id, status: comp.status, gameSlug: comp.gameSlug } });
}
