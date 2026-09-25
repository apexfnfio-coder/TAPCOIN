import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getTreasuryPool, getTreasuryTapBalance } from "@/lib/solanaRpc";
import { TREASURY_WALLET, getCurrentSeason } from "@/lib/season";
import { OFFICIAL_TAP_MINT, TREASURY_TAP_WALLET, LEADERBOARD_REWARD_PERCENT } from "@/modules/games/tap-chimp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const currentSeason = getCurrentSeason();
  const [solPool, treasuryTapBalance] = await Promise.all([
    getTreasuryPool().catch(() => ({ balanceSol: 0, prizePoolSol: 0, rawLamports: 0 })),
    getTreasuryTapBalance(OFFICIAL_TAP_MINT, TREASURY_TAP_WALLET).catch(() => 0),
  ]);

  const feeSums = await db.paymentTx.aggregate({
    where: { season: currentSeason, status: "confirmed" },
    _sum: { amountSol: true },
  }).catch(() => ({ _sum: { amountSol: 0 } }));

  const totalGameFeesSol = feeSums._sum.amountSol ?? 0;

  const leaderboardRewardSharePercent = LEADERBOARD_REWARD_PERCENT;
  const buybackBurnSharePercent = 100 - LEADERBOARD_REWARD_PERCENT;

  const prizePoolSol = Number((totalGameFeesSol * (LEADERBOARD_REWARD_PERCENT / 100)).toFixed(4));
  const buybackBurnPoolSol = Number((totalGameFeesSol * (buybackBurnSharePercent / 100)).toFixed(4));

  const rewardPoolTap = Number((treasuryTapBalance * (LEADERBOARD_REWARD_PERCENT / 100)).toFixed(2));

  const officialPlayersCount = await db.user.count({
    where: {
      OR: [
        { paidSeason: currentSeason },
        { role: "admin" },
        { accessOverride: true },
      ],
      status: "active",
    },
  }).catch(() => 0);

  return ok({
    season: currentSeason,
    recipientWallet: TREASURY_WALLET,
    treasuryTapWallet: TREASURY_TAP_WALLET,
    walletBalanceSol: Number(solPool.balanceSol.toFixed(4)),
    totalGameFeesSol: Number(totalGameFeesSol.toFixed(4)),
    prizePoolSol,
    leaderboardRewardSharePercent,
    buybackBurnPoolSol,
    buybackBurnSharePercent,
    treasuryTapBalance: Number(treasuryTapBalance.toFixed(2)),
    rewardPoolTap,
    officialPlayersCount,
  });
}