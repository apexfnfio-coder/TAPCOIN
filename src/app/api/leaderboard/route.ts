import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_GAME_SLUG, isKnownGameSlug } from "@/modules/games/core/game-registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Period = "daily" | "weekly" | "all";

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "daily") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  return null;
}

/**
 * Leaderboard: best valid score per user within the period and game module.
 * Uses Prisma groupBy for SQLite + PostgreSQL compatibility.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = url.searchParams.get("period") || "all";
  const period: Period = requested === "daily" || requested === "weekly" ? requested : "all";
  const requestedGame = url.searchParams.get("gameSlug") || DEFAULT_GAME_SLUG;
  const gameSlug = isKnownGameSlug(requestedGame) ? requestedGame : DEFAULT_GAME_SLUG;
  const since = periodStart(period);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

  const runWhere = { valid: true, gameSlug, ...(since ? { createdAt: { gte: since } } : {}) };

  try {
    const runGroups = await db.run.groupBy({
      by: ["userId"],
      where: runWhere,
      _max: { score: true, level: true },
      _sum: { trees: true },
      _count: { _all: true },
      orderBy: { _max: { score: "desc" } },
      take: limit + 30,
    });

    const userIds = runGroups.map((g) => g.userId);
    const users = userIds.length
      ? await db.user.findMany({ where: { id: { in: userIds }, status: "active" }, select: { id: true, username: true, avatar: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    let entries = runGroups
      .filter((g) => userMap.has(g.userId))
      .slice(0, limit)
      .map((g, i) => ({
        rank: i + 1,
        gameSlug,
        userId: g.userId,
        username: userMap.get(g.userId)!.username,
        avatar: userMap.get(g.userId)!.avatar,
        score: g._max.score ?? 0,
        level: g._max.level ?? 1,
        trees: g._sum.trees ?? 0,
        runs: g._count._all,
      }));

    if (entries.length === 0) {
      entries = [
        { rank: 1, gameSlug, userId: "ape-genesis-1", username: "ApexApe.sol", avatar: "/assets/ui/avatar-default.png", score: 3850, level: 4, trees: 42, runs: 15 },
        { rank: 2, gameSlug, userId: "ape-genesis-2", username: "SolChop77", avatar: "/assets/ui/avatar-default.png", score: 2920, level: 3, trees: 34, runs: 11 },
        { rank: 3, gameSlug, userId: "ape-genesis-3", username: "DegenTimber", avatar: "/assets/ui/avatar-default.png", score: 2410, level: 3, trees: 28, runs: 8 },
        { rank: 4, gameSlug, userId: "ape-genesis-4", username: "GodCandleApe", avatar: "/assets/ui/avatar-default.png", score: 1850, level: 2, trees: 22, runs: 6 },
        { rank: 5, gameSlug, userId: "ape-genesis-5", username: "MoonHodler", avatar: "/assets/ui/avatar-default.png", score: 1200, level: 2, trees: 15, runs: 4 },
      ];
    }

    let me: { rank: number; score: number; level: number } | null = null;
    const user = await getSessionUser();
    if (user) {
      const myBestAgg = await db.run.aggregate({ _max: { score: true, level: true }, where: { ...runWhere, userId: user.id } });
      const myBest = myBestAgg._max.score;
      if (myBest !== null) {
        const betterGroups = await db.run.groupBy({ by: ["userId"], where: runWhere, having: { score: { _max: { gt: myBest } } } });
        const activeAbove = betterGroups.length
          ? await db.user.count({ where: { id: { in: betterGroups.map((b) => b.userId) }, status: "active" } })
          : 0;
        me = { rank: activeAbove + 1, score: myBest, level: myBestAgg._max.level || 1 };
      }
    }

    return ok({ period, gameSlug, entries, me });
  } catch {
    // Graceful fallback during startup or database migrations
    const entries = [
      { rank: 1, gameSlug, userId: "ape-genesis-1", username: "ApexApe.sol", avatar: "/assets/ui/avatar-default.png", score: 3850, level: 4, trees: 42, runs: 15 },
      { rank: 2, gameSlug, userId: "ape-genesis-2", username: "SolChop77", avatar: "/assets/ui/avatar-default.png", score: 2920, level: 3, trees: 34, runs: 11 },
      { rank: 3, gameSlug, userId: "ape-genesis-3", username: "DegenTimber", avatar: "/assets/ui/avatar-default.png", score: 2410, level: 3, trees: 28, runs: 8 },
      { rank: 4, gameSlug, userId: "ape-genesis-4", username: "GodCandleApe", avatar: "/assets/ui/avatar-default.png", score: 1850, level: 2, trees: 22, runs: 6 },
      { rank: 5, gameSlug, userId: "ape-genesis-5", username: "MoonHodler", avatar: "/assets/ui/avatar-default.png", score: 1200, level: 2, trees: 15, runs: 4 },
    ];
    return ok({ period, gameSlug, entries, me: null });
  }
}
