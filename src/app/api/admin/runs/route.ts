import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/hub";

/** Admin: inspect runs, incl. flagged/suspicious. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const flaggedOnly = url.searchParams.get("flagged") === "1";
  const userId = url.searchParams.get("userId") || undefined;
  const take = 20;

  const where = { ...(flaggedOnly ? { valid: false } : {}), ...(userId ? { userId } : {}) };
  const [runs, total] = await Promise.all([
    db.run.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { user: { select: { username: true } }, competition: { select: { name: true } } },
    }),
    db.run.count({ where }),
  ]);

  return ok({
    runs: runs.map((r) => ({
      id: r.id, username: r.user.username, userId: r.userId,
      gameSlug: r.gameSlug, level: r.level, targetTrees: r.targetTrees,
      progress: r.progress, endedBy: r.endedBy,
      score: r.score, trees: r.trees, green: r.green, redHits: r.redHits,
      durationMs: r.durationMs, valid: r.valid, flags: r.flags,
      competition: r.competition?.name || null, createdAt: r.createdAt.toISOString(),
    })),
    total, page, pages: Math.max(1, Math.ceil(total / take)),
  });
}

const Patch = z.object({ runId: z.string(), invalidate: z.boolean() });

/**
 * Admin: invalidate or restore a run, then recalculate all affected user
 * aggregates (bestScore, totalRuns, totalTrees, etc.) from the remaining
 * valid runs. This is the source-of-truth recalculation pattern — no
 * incremental math that could desync over repeated moderation actions.
 */
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const ip = clientIp(req);

  let body: z.infer<typeof Patch>;
  try {
    body = Patch.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Malformed payload.");
  }
  const run = await db.run.findUnique({ where: { id: body.runId } });
  if (!run) return fail(404, "NOT_FOUND", "Run not found.");

  // 1. Flip the run's validity flag
  await db.run.update({
    where: { id: run.id },
    data: {
      valid: !body.invalidate,
      flags: body.invalidate
        ? [run.flags, "ADMIN_INVALIDATED"].filter(Boolean).join(",")
        : run.flags,
    },
  });

  // 2. Recalculate ALL user aggregate stats from valid runs (source-of-truth rebuild).
  //    Doing this instead of incremental ±1 prevents desync from repeated moderation.
  const userStats = await db.run.aggregate({
    where: { userId: run.userId, valid: true },
    _max: { score: true },
    _count: { _all: true },
    _sum: { trees: true, green: true, redHits: true, durationMs: true },
  });
  await db.user.update({
    where: { id: run.userId },
    data: {
      bestScore: userStats._max.score ?? 0,
      totalRuns: userStats._count._all,
      totalTrees: userStats._sum.trees ?? 0,
      totalGreen: userStats._sum.green ?? 0,
      totalRedHits: userStats._sum.redHits ?? 0,
      totalPlayMs: userStats._sum.durationMs ?? 0,
    },
  });

  // 3. If the run belonged to a competition, recalculate the competition entry too.
  if (run.competitionId) {
    const compStats = await db.run.aggregate({
      where: { userId: run.userId, competitionId: run.competitionId, valid: true },
      _max: { score: true, trees: true },
      _count: { _all: true },
    });

    if (compStats._count._all > 0) {
      // Upsert in case the entry was deleted or not yet created
      await db.competitionEntry.upsert({
        where: {
          competitionId_userId: {
            competitionId: run.competitionId,
            userId: run.userId,
          },
        },
        update: {
          bestScore: compStats._max.score ?? 0,
          bestTrees: compStats._max.trees ?? 0,
          runs: compStats._count._all,
        },
        create: {
          competitionId: run.competitionId,
          userId: run.userId,
          bestScore: compStats._max.score ?? 0,
          bestTrees: compStats._max.trees ?? 0,
          runs: compStats._count._all,
        },
      });
    } else {
      // User has no valid runs left in this competition — remove their entry
      await db.competitionEntry.deleteMany({
        where: { competitionId: run.competitionId, userId: run.userId },
      });
    }
    publish("competitions", { type: "entry", competitionId: run.competitionId, gameSlug: run.gameSlug });
  }

  await audit(body.invalidate ? "ADMIN_RUN_INVALIDATED" : "ADMIN_RUN_RESTORED", {
    actorId: auth.user.id,
    target: run.id,
    meta: { userId: run.userId, score: run.score, gameSlug: run.gameSlug, level: run.level },
    ip,
  });
  publish("leaderboard", { type: "moderation", gameSlug: run.gameSlug });

  return ok({ runId: run.id, valid: !body.invalidate });
}
