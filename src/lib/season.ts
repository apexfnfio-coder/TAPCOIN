import { adminWallets } from "./auth";
import type { User } from "@prisma/client";

export const TREASURY_WALLET = "95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7";
export const SEASON_FEE_SOL = 0.01;
export const SEASON_FEE_LAMPORTS = 10_000_000; // 0.01 SOL

/**
 * Returns current monthly season identifier (e.g. "2026-09").
 * Season resets on the 1st of every month at 00:00 UTC.
 */
export function getCurrentSeason(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isUserAdmin(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.walletAddress && adminWallets().includes(user.walletAddress)) return true;
  return false;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  isAdmin: boolean;
  reason: "admin" | "override_grant" | "override_revoke" | "paid_season" | "unpaid" | "guest";
  season: string;
}

/**
 * Authoritative check if user has access to play official runs for the current season.
 */
export function checkSeasonAccess(user: User | null | undefined): AccessCheckResult {
  const currentSeason = getCurrentSeason();

  if (!user) {
    return { hasAccess: false, isAdmin: false, reason: "guest", season: currentSeason };
  }

  // Admin wallets have perpetual full access without payment confirmation
  if (isUserAdmin(user)) {
    return { hasAccess: true, isAdmin: true, reason: "admin", season: currentSeason };
  }

  // Admin manual override
  if (user.accessOverride === true) {
    return { hasAccess: true, isAdmin: false, reason: "override_grant", season: currentSeason };
  }
  if (user.accessOverride === false) {
    return { hasAccess: false, isAdmin: false, reason: "override_revoke", season: currentSeason };
  }

  // Paid season pass for current month
  if (user.paidSeason === currentSeason) {
    return { hasAccess: true, isAdmin: false, reason: "paid_season", season: currentSeason };
  }

  return { hasAccess: false, isAdmin: false, reason: "unpaid", season: currentSeason };
}
