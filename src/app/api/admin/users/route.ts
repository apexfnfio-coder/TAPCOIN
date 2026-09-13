import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";

/** Admin: user search / list (paginated). */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const take = 15;

  const where = q
    ? {
        OR: [
          { username: { contains: q } },
          { walletAddress: { contains: q } },
          { id: { contains: q } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { _count: { select: { runs: true, competitionRows: true } } },
    }),
    db.user.count({ where }),
  ]);

  return ok({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      walletAddress: u.walletAddress,
      isGuest: u.isGuest,
      role: u.role,
      status: u.status,
      bestScore: u.bestScore,
      totalRuns: u.totalRuns,
      totalTrees: u.totalTrees,
      runsRecorded: u._count.runs,
      competitions: u._count.competitionRows,
      createdAt: u.createdAt.toISOString(),
      lastSeenAt: u.lastSeenAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / take)),
  });
}
