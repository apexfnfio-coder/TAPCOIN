import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getTreasuryPool } from "@/lib/solanaRpc";
import { TREASURY_WALLET, getCurrentSeason } from "@/lib/season";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const currentSeason = getCurrentSeason();
  const pool = await getTreasuryPool().catch(() => ({ balanceSol: 0, prizePoolSol: 0, rawLamports: 0 }));

  // Query confirmed game fees from PaymentTx for current season
  const payments = await db.paymentTx.findMany({
    where: { season: currentSeason },
    select: { amountSol: true },
  }).catch(() => []);

  const totalGameFeesSol = payments.reduce((acc, p) => acc + (p.amountSol || 0.01), 0);

  // Tokenomics: 10% of game fees to Leaderboard Rewards, 90% to $TAP Buyback & Burn
  const leaderboardRewardSharePercent = 10;
  const buybackBurnSharePercent = 90;

  const prizePoolSol = Number((totalGameFeesSol * 0.10).toFixed(4));
  const buybackBurnPoolSol = Number((totalGameFeesSol * 0.90).toFixed(4));

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
    // Live on-chain treasury wallet reserve balance
    walletBalanceSol: Number(pool.balanceSol.toFixed(4)),
    // Confirmed game fees & 10/90 distribution
    totalGameFeesSol: Number(totalGameFeesSol.toFixed(4)),
    prizePoolSol,
    leaderboardRewardSharePercent,
    buybackBurnPoolSol,
    buybackBurnSharePercent,
    officialPlayersCount,
  });
}
