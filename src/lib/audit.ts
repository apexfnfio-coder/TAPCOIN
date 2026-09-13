import { db } from "./db";

export async function audit(
  action: string,
  opts: { actorId?: string; target?: string; meta?: Record<string, unknown>; ip?: string } = {}
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId: opts.actorId,
        target: opts.target || "",
        meta: JSON.stringify(opts.meta || {}),
        ip: opts.ip || "",
      },
    });
  } catch {
    // audit failures must never break the request path
  }
}
