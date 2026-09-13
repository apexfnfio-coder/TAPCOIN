import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";

/** Competition detail + its leaderboard. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const comp = await db.competition.findUnique({
    where: { id: params.id },
    include: { _count: { select: { entries: true } } },
  });
  if (!comp || comp.status === "archived") return fail(404, "NOT_FOUND", "Competition not found.");

  const entries = await db.competitionEntry.findMany({
    where: { competitionId: comp.id },
    orderBy: [{ bestScore: "desc" }, { updatedAt: "asc" }],
    take: 50,
    include: { user: { select: { username: true, avatar: true } } },
  });

  return ok({
    competition: {
      id: comp.id,
      gameSlug: comp.gameSlug,
      name: comp.name,
      description: comp.description,
      rules: comp.rules,
      status: comp.status,
      startsAt: comp.startsAt.toISOString(),
      endsAt: comp.endsAt.toISOString(),
      rewards: JSON.parse(comp.rewardJson || "{}"),
      participants: comp._count.entries,
    },
    leaderboard: entries.map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      username: e.user.username,
      avatar: e.user.avatar,
      score: e.bestScore,
      trees: e.bestTrees,
      runs: e.runs,
    })),
  });
}
