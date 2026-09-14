import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { audit } from "@/lib/audit";

/** Admin: user detail with activity. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 20, include: { competition: { select: { name: true } } } },
      competitionRows: { include: { competition: { select: { name: true, status: true } } } },
      sessions: { orderBy: { createdAt: "desc" }, take: 5, select: { ip: true, userAgent: true, createdAt: true } },
    },
  });
  if (!user) return fail(404, "NOT_FOUND", "User not found.");

  return ok({
    user: {
      id: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      isGuest: user.isGuest,
      role: user.role,
      status: user.status,
      bestScore: user.bestScore,
      totalRuns: user.totalRuns,
      totalTrees: user.totalTrees,
      totalGreen: user.totalGreen,
      totalRedHits: user.totalRedHits,
      totalPlayMs: user.totalPlayMs,
      paidSeason: user.paidSeason,
      accessOverride: user.accessOverride,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt.toISOString(),
    },
    recentRuns: user.runs.map((r) => ({
      id: r.id, score: r.score, trees: r.trees, durationMs: r.durationMs,
      valid: r.valid, flags: r.flags, competition: r.competition?.name || null,
      createdAt: r.createdAt.toISOString(),
    })),
    competitions: user.competitionRows.map((e) => ({
      name: e.competition.name, status: e.competition.status, bestScore: e.bestScore, runs: e.runs,
    })),
    recentSessions: user.sessions.map((s) => ({
      ip: s.ip, userAgent: s.userAgent, createdAt: s.createdAt.toISOString(),
    })),
  });
}

const Patch = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
  accessOverride: z.boolean().nullable().optional(),
});

/** Admin: suspend / reactivate / role change / access control override. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const admin = auth.user;
  const ip = clientIp(req);

  let patch: z.infer<typeof Patch>;
  try {
    patch = Patch.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Malformed request.");
  }
  if (!patch.status && !patch.role && patch.accessOverride === undefined) return fail(400, "BAD_INPUT", "Nothing to update.");

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail(404, "NOT_FOUND", "User not found.");
  if (target.id === admin.id && patch.status) return fail(400, "SELF_ACTION", "You cannot suspend your own account.");

  const updated = await db.user.update({
    where: { id: target.id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.role ? { role: patch.role } : {}),
      ...(patch.accessOverride !== undefined ? { accessOverride: patch.accessOverride } : {}),
    },
  });

  // suspension kills all live sessions
  if (patch.status === "suspended") {
    await db.session.deleteMany({ where: { userId: target.id } });
  }
  await audit("ADMIN_USER_UPDATED", {
    actorId: admin.id,
    target: target.id,
    meta: { before: { status: target.status, role: target.role, accessOverride: target.accessOverride }, after: patch },
    ip,
  });

  return ok({
    user: {
      id: updated.id,
      status: updated.status,
      role: updated.role,
      accessOverride: updated.accessOverride,
      paidSeason: updated.paidSeason,
    },
  });
}
