import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/hub";
import { isKnownGameSlug } from "@/modules/games/core/game-registry";

const Patch = z.object({
  gameSlug: z.string().refine(isKnownGameSlug, "Unknown game module").optional(),
  name: z.string().min(3).max(60).optional(),
  description: z.string().max(500).optional(),
  rules: z.string().max(1000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  rewards: z.record(z.union([z.string(), z.number()])).optional(),
  status: z.enum(["scheduled", "live", "ended", "archived"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const ip = clientIp(req);

  let body: z.infer<typeof Patch>;
  try {
    body = Patch.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Malformed payload.");
  }

  const comp = await db.competition.findUnique({ where: { id: params.id } });
  if (!comp) return fail(404, "NOT_FOUND", "Competition not found.");

  const startsAt = body.startsAt ? new Date(body.startsAt) : comp.startsAt;
  const endsAt = body.endsAt ? new Date(body.endsAt) : comp.endsAt;
  if (endsAt <= startsAt) return fail(400, "BAD_WINDOW", "End time must be after start time.");

  const updated = await db.competition.update({
    where: { id: comp.id },
    data: {
      ...(body.gameSlug !== undefined ? { gameSlug: body.gameSlug } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.rules !== undefined ? { rules: body.rules } : {}),
      ...(body.startsAt !== undefined ? { startsAt } : {}),
      ...(body.endsAt !== undefined ? { endsAt } : {}),
      ...(body.rewards !== undefined ? { rewardJson: JSON.stringify(body.rewards) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });

  await audit("ADMIN_COMPETITION_UPDATED", { actorId: auth.user.id, target: comp.id, meta: { before: { name: comp.name, status: comp.status, gameSlug: comp.gameSlug }, after: body }, ip });
  publish("competitions", { type: "changed", gameSlug: updated.gameSlug });
  return ok({ competition: { id: updated.id, status: updated.status, gameSlug: updated.gameSlug } });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const ip = clientIp(req);

  const comp = await db.competition.findUnique({ where: { id: params.id } });
  if (!comp) return fail(404, "NOT_FOUND", "Competition not found.");

  await db.competition.update({ where: { id: comp.id }, data: { status: "archived" } });
  await audit("ADMIN_COMPETITION_ARCHIVED", { actorId: auth.user.id, target: comp.id, meta: { name: comp.name, gameSlug: comp.gameSlug }, ip });
  publish("competitions", { type: "changed", gameSlug: comp.gameSlug });
  return ok({ archived: true });
}
