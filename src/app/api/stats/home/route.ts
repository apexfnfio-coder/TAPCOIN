import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { DEFAULT_GAME_SLUG } from "@/modules/games/core/game-registry";

interface HomeStats {
  gameSlug: string;
  totals: { players: number; runs: number; trees: number };
  liveCompetition: { id: string; gameSlug: string; name: string; status: string; endsAt: string; participants: number } | null;
  top: { username: string; score: number; level: number }[];
}

/** Public aggregate stats for the default game. Cached 30 s. */
let cache: { at: number; data: HomeStats } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 30_000) return ok(cache.data);

  const now = new Date();
  const gameSlug = DEFAULT_GAME_SLUG;

  await db.competition.updateMany({ where: { status: "scheduled", startsAt: { lte: now }, endsAt: { gt: now } }, data: { status: "live" } });
  await db.competition.updateMany({ where: { status: { in: ["scheduled", "live"] }, endsAt: { lte: now } }, data: { status: "ended" } });

  const [players, runsAgg, live, topRunGroups] = await Promise.all([
    db.user.count({ where: { status: "active" } }),
    db.run.aggregate({ _count: true, _sum: { trees: true }, where: { valid: true, gameSlug } }),
    db.competition.findFirst({ where: { status: "live", gameSlug }, orderBy: { endsAt: "asc" }, include: { _count: { select: { entries: true } } } }),
    db.run.groupBy({ by: ["userId"], where: { valid: true, gameSlug }, _max: { score: true, level: true }, orderBy: { _max: { score: "desc" } }, take: 15 }),
  ]);

  const topUserIds = topRunGroups.map((g) => g.userId);
  const topUsers = topUserIds.length ? await db.user.findMany({ where: { id: { in: topUserIds }, status: "active" }, select: { id: true, username: true } }) : [];
  const topUserMap = new Map(topUsers.map((u) => [u.id, u]));

  const top = topRunGroups
    .filter((g) => topUserMap.has(g.userId))
    .slice(0, 5)
    .map((g) => ({ username: topUserMap.get(g.userId)!.username, score: g._max.score ?? 0, level: g._max.level ?? 1 }));

  const data: HomeStats = {
    gameSlug,
    totals: { players, runs: runsAgg._count, trees: runsAgg._sum.trees ?? 0 },
    liveCompetition: live ? { id: live.id, gameSlug: live.gameSlug, name: live.name, status: live.status, endsAt: live.endsAt.toISOString(), participants: live._count.entries } : null,
    top,
  };

  cache = { at: Date.now(), data };
  return ok(data);
}
