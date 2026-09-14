import { z } from "zod";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, getSessionUser, adminWallets } from "@/lib/auth";
import { ok, fail, clientIp, rateLimit } from "@/lib/http";
import { publicUser } from "@/lib/serialize";
import { audit } from "@/lib/audit";

const Body = z.object({
  wallet: z.string().min(32).max(64),
  signature: z.string().min(32),
  nonce: z.string().min(8),
});

/** Step 2: verify ed25519 signature against the issued nonce; bind wallet to account. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`wallet:${ip}`, 20, 60_000)) {
    return fail(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, "BAD_INPUT", "Malformed request.");
  }
  const { wallet, signature, nonce } = body;

  try {
    // consume nonce (one-time, 5 min expiry)
    const row = await db.authNonce.findUnique({ where: { nonce } });
    if (!row || row.wallet !== wallet) return fail(400, "BAD_NONCE", "Nonce not found. Request a new one.");
    await db.authNonce.delete({ where: { nonce } }).catch(() => {});
    if (row.expiresAt < new Date()) return fail(400, "NONCE_EXPIRED", "Nonce expired. Try again.");

    const message = [
      "$TAP — Sign to verify wallet ownership",
      "",
      `Wallet: ${wallet}`,
      `Nonce: ${nonce}`,
      "",
      "This signature proves ownership and costs no gas.",
    ].join("\n");

    let verified = false;
    try {
      verified = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        bs58.decode(signature),
        bs58.decode(wallet)
      );
    } catch {
      verified = false;
    }
    if (!verified) {
      await audit("WALLET_AUTH_FAILED", { target: wallet, ip });
      return fail(401, "BAD_SIGNATURE", "Signature verification failed.");
    }

    // find or create wallet account; merge guest session data when possible
    let user = await db.user.findUnique({ where: { walletAddress: wallet } });
    const current = await getSessionUser();
    if (!user) {
      if (current && current.isGuest && !current.walletAddress) {
        // upgrade guest -> wallet account, keep stats
        user = await db.user.update({
          where: { id: current.id },
          data: { walletAddress: wallet, isGuest: false },
        });
      } else {
        const name = `Ape-${wallet.slice(0, 6)}`;
        user = await db.user.create({ data: { username: name, walletAddress: wallet, isGuest: false } });
      }
    }
    // admin elevation via env allowlist
    if (adminWallets().includes(wallet) && user.role !== "admin") {
      user = await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
      await audit("ADMIN_GRANTED", { actorId: user.id, ip });
    }

    const { token, expiresAt } = await createSession(user.id, ip, req.headers.get("user-agent") || "");
    setSessionCookie(token, expiresAt);
    await audit("WALLET_CONNECTED", { actorId: user.id, target: wallet, ip });
    return ok({ user: publicUser(user) });
  } catch (err: any) {
    return fail(500, "DATABASE_ERROR", `Failed to complete wallet verification: ${err?.message || "Database unavailable"}`);
  }
}
