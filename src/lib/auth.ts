import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import type { User } from "@prisma/client";

const COOKIE_NAME = "tap_session";
const SESSION_DAYS = 30;

function secret() {
  return process.env.SESSION_SECRET || "dev-only-secret-change-me";
}

export function hashToken(token: string) {
  return crypto.createHmac("sha256", secret()).update(token).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string, ip = "", ua = "") {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, ip, userAgent: ua.slice(0, 255) },
  });
  return { token, expiresAt };
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" });
}

export async function getSessionUser(): Promise<User | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "active") return null;
  // sliding last-seen (cheap, best-effort)
  db.user.update({ where: { id: session.user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return session.user;
}

export async function destroySession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  clearSessionCookie();
}

const DEFAULT_ADMIN_WALLETS = ["2Mz6kawWjgVVTKvPvs9xzhVV37qWP5aHM5EsbSYnndCE"];

export function adminWallets(): string[] {
  const envList = (process.env.ADMIN_WALLETS || "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_WALLETS, ...envList]));
}
