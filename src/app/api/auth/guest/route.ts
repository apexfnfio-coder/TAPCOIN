import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { ok, fail, clientIp, rateLimit } from "@/lib/http";
import { publicUser } from "@/lib/serialize";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Guest session — instant play, upgradeable to wallet account later. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`guest:${ip}`, 10, 60_000)) {
    return fail(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
  }

  const existing = await getSessionUser();
  if (existing) return ok({ user: publicUser(existing) });

  const guestName = `Ape-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const user = await db.user.create({ data: { username: guestName, isGuest: true } });
  const { token, expiresAt } = await createSession(user.id, ip, req.headers.get("user-agent") || "");
  setSessionCookie(token, expiresAt);
  await audit("GUEST_CREATED", { actorId: user.id, ip });
  return ok({ user: publicUser(user) });
}
