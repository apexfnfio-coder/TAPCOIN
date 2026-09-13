import { z } from "zod";
import { ok, fail, clientIp } from "@/lib/http";
import { requireAdmin } from "@/lib/guard";
import { getConfig, saveConfig } from "@/lib/config";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/hub";
import { isKnownGameSlug } from "@/modules/games/core/game-registry";

export async function GET() {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  return ok({ config: await getConfig() });
}

const GameSchema = z.object({
  runDurationSec: z.number().int().min(15).max(300),
  treeHp: z.number().int().min(1).max(28),
  chopIntervalMs: z.number().int().min(150).max(2000),
  pointsPerTree: z.number().int().min(1).max(10000),
  pointsPerGreen: z.number().int().min(0).max(1000),
  redHitPenaltySec: z.number().int().min(0).max(30),
  redHitScorePenalty: z.number().int().min(0).max(1000),
  playerSpeed: z.number().int().min(100).max(1000),
  treeSpacingMin: z.number().int().min(200).max(2000),
  treeSpacingMax: z.number().int().min(300).max(4000),
  candleChanceGreen: z.number().min(0).max(1),
  candleChanceRed: z.number().min(0).max(1),
  maxDurationSec: z.number().int().min(30).max(600),
  defaultGameSlug: z.string().refine(isKnownGameSlug, "Unknown game module"),
  levelGoalBase: z.number().int().min(1).max(100),
  levelGoalGrowth: z.number().min(0).max(20),
  difficultyGrowth: z.number().min(0.01).max(2),
  maxLevelDurationSec: z.number().int().min(30).max(900),
});

const TokenSchema = z.object({
  symbol: z.string().min(1).max(12),
  name: z.string().max(60),
  contractAddress: z.string().max(64).refine((s) => s === "" || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s), "Invalid Solana address"),
  cluster: z.string().max(20),
  decimals: z.number().int().min(0).max(18),
  buyLinks: z.array(z.object({ label: z.string().max(30), url: z.string().url().max(300) })).max(8),
  explorerUrl: z.string().url().max(200).or(z.literal("")),
  priceUsd: z.number().min(0).max(1000000),
  priceSource: z.enum(["local", "manual", "api"]),
  minHoldingUsd: z.number().min(0).max(1000000),
});

const EligibilitySchema = z.object({
  enabled: z.boolean(),
  state: z.enum(["requires-token", "open"]),
  text: z.string().max(240),
});

const LinksSchema = z.object({
  twitter: z.string().max(200), telegram: z.string().max(200),
  discord: z.string().max(200), website: z.string().max(200),
});

const Body = z.object({
  game: GameSchema.optional(),
  token: TokenSchema.optional(),
  links: LinksSchema.optional(),
  leaderboardEligibility: EligibilitySchema.optional(),
  announcement: z.string().max(300).optional(),
  maintenance: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;
  const ip = clientIp(req);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? `${e.errors[0]?.path.join(".")}: ${e.errors[0]?.message}` : "Invalid config.";
    return fail(400, "BAD_INPUT", msg);
  }
  if (body.game && body.game.treeSpacingMax < body.game.treeSpacingMin) return fail(400, "BAD_INPUT", "treeSpacingMax must be >= treeSpacingMin.");

  const current = await getConfig();
  const next = {
    game: { ...current.game, ...(body.game || {}) },
    token: { ...current.token, ...(body.token || {}) },
    links: { ...current.links, ...(body.links || {}) },
    leaderboardEligibility: { ...current.leaderboardEligibility, ...(body.leaderboardEligibility || {}) },
    announcement: body.announcement !== undefined ? body.announcement : current.announcement,
    maintenance: body.maintenance !== undefined ? body.maintenance : current.maintenance,
  };

  await saveConfig(next, auth.user.id);
  await audit("ADMIN_CONFIG_UPDATED", { actorId: auth.user.id, target: "public", meta: { sections: Object.keys(body) }, ip });
  publish("config", { type: "changed" });
  return ok({ config: next });
}
