import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { ok, fail, clientIp, rateLimit } from "@/lib/http";

const Body = z.object({ wallet: z.string().min(32).max(64) });

/** Step 1 of wallet auth: issue a one-time nonce message to sign. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`nonce:${ip}`, 20, 60_000)) {
    return fail(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
  }
  let wallet: string;
  try {
    wallet = Body.parse(await req.json()).wallet;
  } catch {
    return fail(400, "BAD_INPUT", "Invalid wallet address.");
  }

  // Clean up all previous nonces for this wallet — only one active nonce per wallet needed.
  // This also prevents accumulation of expired/abandoned nonces in the DB.
  await db.authNonce.deleteMany({ where: { wallet } });

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await db.authNonce.create({ data: { wallet, nonce, expiresAt } });

  const message = [
    "$TAP — Sign to verify wallet ownership",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    "",
    "This signature proves ownership and costs no gas.",
  ].join("\n");

  return ok({ message, nonce });
}
