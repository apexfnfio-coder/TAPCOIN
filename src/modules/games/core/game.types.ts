export type GameSlug = "tap-chimp";

export type GameRunOutcome = "completed" | "failed" | "quit";

export interface GameModuleConfig {
  slug: GameSlug;
  name: string;
  version: string;
  description: string;
  assetBasePath: string;
}

export interface LevelDefinition {
  gameSlug: GameSlug;
  level: number;
  seed: string;
  targetTrees: number;
  treeHp: number;
  chopIntervalMs: number;
  playerSpeed: number;
  treeSpacingMin: number;
  treeSpacingMax: number;
  candleChanceGreen: number;
  candleChanceRed: number;
  maxRedHits: number;
  maxDurationSec: number;
  difficulty: number;
}

export interface SubmittedRunCore {
  gameSlug: GameSlug;
  level: number;
  targetTrees: number;
  progress: number;
  score: number;
  trees: number;
  green: number;
  redHits: number;
  durationMs: number;
  endedBy: GameRunOutcome;
}

export interface GameModule {
  config: GameModuleConfig;
  isKnownSlug: (slug: string) => slug is GameSlug;
}
