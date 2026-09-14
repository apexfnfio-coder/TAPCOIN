import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("res" in auth) return auth.res;

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

  const payments = await db.paymentTx.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          walletAddress: true,
          accessOverride: true,
          status: true,
        },
      },
    },
  });

  const totalCollectedSol = await db.paymentTx.aggregate({
    _sum: { amountSol: true },
    where: { status: "confirmed" },
  });

  return ok({
    payments,
    totalPayments: payments.length,
    totalCollectedSol: totalCollectedSol._sum.amountSol || 0,
  });
}
