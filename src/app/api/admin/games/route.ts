import { z } from "zod";
import { ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { getConfig, saveConfig } from "@/lib/config";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/hub";
import { DEFAULT_GAME_SLUG, isKnownGameSlug, listGameModules } from "@/modules/games/core/game-registry";

export async function GET() {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const cfg = await getConfig();
  return ok({
    defaultGameSlug: cfg.game.defaultGameSlug,
    games: listGameModules().map((module) => ({
      ...module.config,
      active: module.config.slug === cfg.game.defaultGameSlug,
    })),
  });
}

const Body = z.object({
  defaultGameSlug: z.string().refine(isKnownGameSlug, "Unknown game module"),
});

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const ip = clientIp(req);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0]?.message || "Invalid game module." : "Invalid game module.";
    return fail(400, "BAD_INPUT", message);
  }

  const cfg = await getConfig();
  const next = { ...cfg, game: { ...cfg.game, defaultGameSlug: body.defaultGameSlug || DEFAULT_GAME_SLUG } };
  await saveConfig(next, auth.user.id);
  await audit("ADMIN_DEFAULT_GAME_UPDATED", { actorId: auth.user.id, target: body.defaultGameSlug, meta: {}, ip });
  publish("config", { type: "changed" });
  return ok({ defaultGameSlug: next.game.defaultGameSlug });
}
