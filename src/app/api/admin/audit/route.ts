import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";

/** Admin: audit log (paginated, filterable by action). */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const action = (url.searchParams.get("action") || "").trim();
  const take = 25;

  const where = action ? { action: { contains: action } } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { actor: { select: { username: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      actor: l.actor?.username || "system",
      target: l.target,
      meta: l.meta,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / take)),
  });
}
