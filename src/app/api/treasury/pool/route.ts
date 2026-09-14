import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getTreasuryPool } from "@/lib/solanaRpc";
import { TREASURY_WALLET, getCurrentSeason } from "@/lib/season";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const currentSeason = getCurrentSeason();
  const pool = await getTreasuryPool();

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
    balanceSol: Number(pool.balanceSol.toFixed(4)),
    prizePoolSol: Number(pool.prizePoolSol.toFixed(4)),
    prizePoolSharePercent: 10,
    officialPlayersCount,
  });
}
