import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { getTreasuryPool } from "@/lib/solanaRpc";
import { getCurrentSeason } from "@/lib/season";

export async function GET() {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentSeason = getCurrentSeason();

  const [users, usersToday, runs, runsToday, sums, liveCompetitions, flaggedRuns, recentRuns, recentAudit, officialPlayers, pool, recentPayments] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: today } } }),
      db.run.count({ where: { valid: true } }),
      db.run.count({ where: { valid: true, createdAt: { gte: today } } }),
      db.run.aggregate({ _sum: { trees: true, green: true }, where: { valid: true } }),
      db.competition.count({ where: { status: "live" } }),
      db.run.count({ where: { valid: false } }),
      db.run.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { username: true } } },
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { username: true } } },
      }),
      db.user.count({
        where: {
          OR: [
            { paidSeason: currentSeason },
            { role: "admin" },
            { accessOverride: true },
          ],
          status: "active",
        },
      }).catch(() => 0),
      getTreasuryPool().catch(() => ({ balanceSol: 0, prizePoolSol: 0 })),
      db.paymentTx.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { username: true } } },
      }).catch(() => []),
    ]);

  return ok({
    totals: {
      users,
      runs,
      trees: sums._sum.trees || 0,
      green: sums._sum.green || 0,
    },
    officialPlayers,
    season: currentSeason,
    treasuryPool: {
      balanceSol: Number(pool.balanceSol.toFixed(4)),
      prizePoolSol: Number(pool.prizePoolSol.toFixed(4)),
    },
    today: { users: usersToday, runs: runsToday },
    liveCompetitions,
    flaggedRuns,
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      username: r.user.username,
      gameSlug: r.gameSlug,
      level: r.level,
      progress: r.progress,
      targetTrees: r.targetTrees,
      endedBy: r.endedBy,
      score: r.score,
      trees: r.trees,
      durationMs: r.durationMs,
      valid: r.valid,
      flags: r.flags || null,
      createdAt: r.createdAt.toISOString(),
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      wallet: p.wallet,
      username: p.user?.username || "Player",
      amountSol: p.amountSol,
      signature: p.signature,
      solscanUrl: p.solscanUrl,
      createdAt: p.createdAt.toISOString(),
    })),
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor?.username || "system",
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
