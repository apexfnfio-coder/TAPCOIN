import type { User } from "@prisma/client";

/** Public-facing shapes — never leak internal fields. */

export function publicUser(u: User) {
  return {
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    walletAddress: u.walletAddress,
    isGuest: u.isGuest,
    role: u.role,
    bestScore: u.bestScore,
    totalRuns: u.totalRuns,
    totalTrees: u.totalTrees,
    totalGreen: u.totalGreen,
    totalRedHits: u.totalRedHits,
    totalPlayMs: u.totalPlayMs,
    createdAt: u.createdAt.toISOString(),
  };
}

export function shortWallet(w?: string | null) {
  if (!w) return null;
  return w.length > 10 ? `${w.slice(0, 4)}...${w.slice(-4)}` : w;
}
