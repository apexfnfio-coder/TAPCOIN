import { ok } from "@/lib/http";
import { listGameModules, DEFAULT_GAME_SLUG } from "@/modules/games/core/game-registry";

/** Public catalog of available game modules. */
export async function GET() {
  return ok({
    defaultGameSlug: DEFAULT_GAME_SLUG,
    games: listGameModules().map((module) => module.config),
  });
}
