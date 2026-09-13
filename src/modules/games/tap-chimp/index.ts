import type { GameModule } from "../core/game.types";
import { TAP_CHIMP_MODULE_CONFIG, TAP_CHIMP_SLUG } from "./tap-chimp.config";

export * from "./tap-chimp.config";
export * from "./level-generator";
export * from "./score-rules";

export const TapChimpModule: GameModule = {
  config: TAP_CHIMP_MODULE_CONFIG,
  isKnownSlug: (slug: string): slug is typeof TAP_CHIMP_SLUG => slug === TAP_CHIMP_SLUG,
};
