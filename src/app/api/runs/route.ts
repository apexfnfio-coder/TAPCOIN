import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, clientIp, rateLimit } from "@/lib/http";
import { requireUser } from "@/lib/guard";
import { getConfig } from "@/lib/config";
import { verifyRun } from "@/lib/scoreVerify";
import { evaluateTokenEligibility } from "@/lib/tokenEligibility";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/hub";
import { DEFAULT_GAME_SLUG, isKnownGameSlug } from "@/modules/games/core/game-registry";

const Submit = z.object({
  gameSlug: z.string().max(40).optional(),
  level: z.number().int().min(1).max(999999).optional(),
  targetTrees: z.number().int().min(0).max(10000).optional(),
  progress: z.number().int().min(0).max(10000).optional(),
  score: z.number().int().min(0),
  trees: z.number().int().min(0),
  green: z.number().int().min(0),
  redHits: z.number().int().min(0),
  durationMs: z.number().int().min(1),
  endedBy: z.enum(["completed", "failed", "quit", "time"]),
  competitionId: z.string().optional(),
  clientVersion: z.string().max(32).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const { user } = auth;
  const ip = clientIp(req);
  if (!rateLimit(`run:${user.id}`, 12, 60_000)) return fail(429, "RATE_LIMITED", "Submitting too fast. Slow down.");

  let body: z.infer<typeof Submit>;
  try {
    body = Submit.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Malformed run payload.");
  }

  const cfg = await getConfig();
  const verdict = verifyRun(body, cfg.game);
  const eligibility = await evaluateTokenEligibility(user.walletAddress, cfg);
  if (cfg.leaderboardEligibility.enabled && cfg.leaderboardEligibility.state === "requires-token" && !eligibility.eligible) {
    verdict.valid = false;
    verdict.flags.push(`LEADERBOARD_${eligibility.status.toUpperCase()}`);
  }

  let competitionId: string | undefined;
  if (body.competitionId) {
    const comp = await db.competition.findUnique({ where: { id: body.competitionId } });
    const now = new Date();
    if (comp && comp.status === "live" && comp.startsAt <= now && comp.endsAt >= now && comp.gameSlug === verdict.gameSlug) {
      competitionId = comp.id;
    } else {
      verdict.valid = false;
      verdict.flags.push(comp?.gameSlug && comp.gameSlug !== verdict.gameSlug ? "COMPETITION_GAME_MISMATCH" : "COMPETITION_NOT_LIVE");
    }
  }

  const run = await db.run.create({
    data: {
      userId: user.id,
      competitionId,
      gameSlug: verdict.gameSlug,
      level: verdict.level,
      targetTrees: verdict.targetTrees,
      progress: verdict.progress,
      endedBy: verdict.endedBy,
      score: verdict.valid ? body.score : verdict.expectedScore,
      trees: body.trees,
      green: body.green,
      redHits: body.redHits,
      durationMs: Math.min(body.durationMs, cfg.game.maxLevelDurationSec * 1000),
      valid: verdict.valid,
      flags: [...new Set(verdict.flags)].join(","),
      clientVersion: (body.clientVersion || "").slice(0, 32),
    },
  });

  if (verdict.valid) {
    await db.user.update({
      where: { id: user.id },
      data: {
        totalRuns: { increment: 1 },
        totalTrees: { increment: body.trees },
        totalGreen: { increment: body.green },
        totalRedHits: { increment: body.redHits },
        totalPlayMs: { increment: run.durationMs },
        bestScore: body.score > user.bestScore ? body.score : user.bestScore,
      },
    });

    if (competitionId) {
      const existing = await db.competitionEntry.findUnique({ where: { competitionId_userId: { competitionId, userId: user.id } } });
      await db.competitionEntry.upsert({
        where: { competitionId_userId: { competitionId, userId: user.id } },
        update: {
          runs: { increment: 1 },
          bestScore: body.score > (existing?.bestScore || 0) ? body.score : existing!.bestScore,
          bestTrees: body.trees > (existing?.bestTrees || 0) ? body.trees : existing!.bestTrees,
        },
        create: { competitionId, userId: user.id, bestScore: body.score, bestTrees: body.trees, runs: 1 },
      });
      publish("competitions", { type: "entry", competitionId, gameSlug: verdict.gameSlug });
    }
    publish("leaderboard", { type: "run", period: "all", gameSlug: verdict.gameSlug });
  } else {
    await audit("RUN_FLAGGED", { actorId: user.id, target: run.id, meta: { flags: verdict.flags, eligibility }, ip });
  }

  const freshUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const myBestAgg = await db.run.aggregate({
    _max: { score: true },
    where: { userId: user.id, gameSlug: verdict.gameSlug, valid: true },
  });
  const myBest = myBestAgg._max.score || 0;
  const betterGroups = myBest
    ? await db.run.groupBy({
        by: ["userId"],
        where: { gameSlug: verdict.gameSlug, valid: true },
        having: { score: { _max: { gt: myBest } } },
      })
    : [];
  const better = betterGroups.length
    ? await db.user.count({ where: { id: { in: betterGroups.map((b) => b.userId) }, status: "active" } })
    : 0;
  const competition = competitionId
    ? await db.competitionEntry.findUnique({
        where: { competitionId_userId: { competitionId, userId: user.id } },
        include: { competition: { select: { name: true } } },
      })
    : null;

  return ok({
    run: {
      id: run.id,
      gameSlug: run.gameSlug,
      level: run.level,
      targetTrees: run.targetTrees,
      progress: run.progress,
      endedBy: run.endedBy,
      score: run.score,
      trees: run.trees,
      green: run.green,
      redHits: run.redHits,
      durationMs: run.durationMs,
      valid: run.valid,
      flags: run.flags ? run.flags.split(",") : [],
      createdAt: run.createdAt.toISOString(),
    },
    stats: { bestScore: freshUser.bestScore, isPersonalBest: verdict.valid && body.score === myBest && body.score > 0, rank: verdict.valid ? better + 1 : null },
    eligibility,
    competition: competition ? { id: competitionId!, name: competition.competition.name, bestScore: competition.bestScore } : null,
  });
}

/** Current user's run history (paginated). */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const take = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
  const gameParam = url.searchParams.get("gameSlug") || DEFAULT_GAME_SLUG;
  const gameSlug = isKnownGameSlug(gameParam) ? gameParam : DEFAULT_GAME_SLUG;
  const where = { userId: auth.user.id, gameSlug };
  const [runs, total] = await Promise.all([
    db.run.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { competition: { select: { name: true } } } }),
    db.run.count({ where }),
  ]);
  return ok({
    gameSlug,
    runs: runs.map((r) => ({
      id: r.id,
      gameSlug: r.gameSlug,
      level: r.level,
      targetTrees: r.targetTrees,
      progress: r.progress,
      endedBy: r.endedBy,
      score: r.score,
      trees: r.trees,
      green: r.green,
      redHits: r.redHits,
      durationMs: r.durationMs,
      valid: r.valid,
      competition: r.competition?.name || null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / take)),
  });
}
