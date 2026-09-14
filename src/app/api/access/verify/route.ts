import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { ok, fail, clientIp, rateLimit } from "@/lib/http";
import { getCurrentSeason, TREASURY_WALLET, SEASON_FEE_SOL } from "@/lib/season";
import { verifySolanaPaymentTx } from "@/lib/solanaRpc";
import { audit } from "@/lib/audit";

const VerifyBody = z.object({
  signature: z.string().min(40).max(128),
  wallet: z.string().min(32).max(64),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const { user } = auth;

  const ip = clientIp(req);
  if (!rateLimit(`verify_pay:${user.id}`, 6, 60_000)) {
    return fail(429, "RATE_LIMITED", "Too many verification requests. Try again shortly.");
  }

  let body: z.infer<typeof VerifyBody>;
  try {
    body = VerifyBody.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Invalid signature or wallet address.");
  }

  const { signature, wallet } = body;
  const currentSeason = getCurrentSeason();

  // 1. Anti-cheat / Anti-replay: Ensure signature has not already been used
  const existingTx = await db.paymentTx.findUnique({
    where: { signature },
  });
  if (existingTx) {
    return fail(409, "SIGNATURE_ALREADY_USED", "This transaction signature has already been claimed.");
  }

  // 2. On-Chain Verification via Solana RPC
  const verification = await verifySolanaPaymentTx(signature, wallet);
  if (!verification.valid) {
    await audit("SEASON_PAYMENT_REJECTED", {
      actorId: user.id,
      target: wallet,
      meta: { signature, error: verification.error },
      ip,
    });
    return fail(400, "VERIFICATION_FAILED", verification.error || "Failed to verify transaction on Solana blockchain.");
  }

  // 3. Record confirmed payment in database & update user's active season
  const solscanUrl = `https://solscan.io/tx/${signature}`;

  const payment = await db.paymentTx.create({
    data: {
      userId: user.id,
      wallet,
      recipient: TREASURY_WALLET,
      amountSol: SEASON_FEE_SOL,
      signature,
      season: currentSeason,
      status: "confirmed",
      solscanUrl,
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      paidSeason: currentSeason,
      walletAddress: user.walletAddress || wallet,
    },
  });

  await audit("SEASON_PASS_ACTIVATED", {
    actorId: user.id,
    target: wallet,
    meta: { signature, season: currentSeason, solscanUrl },
    ip,
  });

  return ok({
    activated: true,
    season: currentSeason,
    solscanUrl,
    paymentId: payment.id,
  });
}
