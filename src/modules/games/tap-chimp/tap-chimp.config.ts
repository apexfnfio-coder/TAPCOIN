import type { GameModuleConfig, GameSlug } from "../core/game.types";

export const TAP_CHIMP_SLUG: GameSlug = "tap-chimp";
export const OFFICIAL_TAP_MINT = "ADcF26nFGKMuRZ7va5361H2PCHCDRi2FmeJBkX3Spump";

export const TAP_CHIMP_MODULE_CONFIG: GameModuleConfig = {
  slug: TAP_CHIMP_SLUG,
  name: "$TAP Chimp",
  version: "1.1.0",
  description: "Level-based arcade chopping game for the $TAP platform.",
  assetBasePath: "/assets",
};

export const TAP_CHIMP_SAFE_PRICE_USD = 0.0042;
export const TAP_CHIMP_MIN_HOLDING_USD = 0;
