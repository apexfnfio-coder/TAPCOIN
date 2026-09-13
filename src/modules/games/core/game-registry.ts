import type { GameModule, GameSlug } from "./game.types";
import { TapChimpModule, TAP_CHIMP_SLUG } from "../tap-chimp";

const MODULES: Record<GameSlug, GameModule> = {
  [TAP_CHIMP_SLUG]: TapChimpModule,
};

export function getGameModule(slug: string | null | undefined): GameModule | null {
  if (!slug) return MODULES[TAP_CHIMP_SLUG];
  return slug in MODULES ? MODULES[slug as GameSlug] : null;
}

export function assertGameSlug(slug: string | null | undefined): GameSlug {
  const module = getGameModule(slug);
  if (!module) return TAP_CHIMP_SLUG;
  return module.config.slug;
}

export function isKnownGameSlug(slug: string): slug is GameSlug {
  return slug in MODULES;
}

export function listGameModules(): GameModule[] {
  return Object.values(MODULES);
}

export const DEFAULT_GAME_SLUG = TAP_CHIMP_SLUG;
