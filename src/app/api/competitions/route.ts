import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_GAME_SLUG, isKnownGameSlug } from "@/modules/games/core/game-registry";

/** Public competition listing with live status resolution. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all"; // live | upcoming | ended | all
  const requestedGame = url.searchParams.get("gameSlug") || DEFAULT_GAME_SLUG;
  const gameSlug = isKnownGameSlug(requestedGame) ? requestedGame : DEFAULT_GAME_SLUG;
  const now = new Date();

  await db.competition.updateMany({ where: { status: "scheduled", startsAt: { lte: now }, endsAt: { gt: now } }, data: { status: "live" } });
  await db.competition.updateMany({ where: { status: { in: ["scheduled", "live"] }, endsAt: { lte: now } }, data: { status: "ended" } });

  const statusWhere =
    filter === "live"
      ? { status: "live" as const }
      : filter === "upcoming"
        ? { status: "scheduled" as const }
        : filter === "ended"
          ? { status: { in: ["ended" as const, "archived" as const] } }
          : { status: { not: "archived" as const } };
  const where = { ...statusWhere, gameSlug };

  const comps = await db.competition.findMany({ where, orderBy: [{ status: "asc" }, { startsAt: "desc" }], take: 50, include: { _count: { select: { entries: true } } } });

  const user = await getSessionUser();
  let myEntries: Record<string, { bestScore: number; runs: number }> = {};
  if (user && comps.length) {
    const rows = await db.competitionEntry.findMany({ where: { userId: user.id, competitionId: { in: comps.map((c) => c.id) } } });
    myEntries = Object.fromEntries(rows.map((r) => [r.competitionId, { bestScore: r.bestScore, runs: r.runs }]));
  }

  return ok({
    gameSlug,
    competitions: comps.map((c) => ({
      id: c.id,
      gameSlug: c.gameSlug,
      name: c.name,
      description: c.description,
      rules: c.rules,
      status: c.status,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      rewards: JSON.parse(c.rewardJson || "{}"),
      participants: c._count.entries,
      me: myEntries[c.id] || null,
    })),
  });
}
