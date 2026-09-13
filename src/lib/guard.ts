import { getSessionUser } from "./auth";
import { fail } from "./http";
import type { User } from "@prisma/client";

export async function requireUser(): Promise<{ user: User } | { res: ReturnType<typeof fail> }> {
  const user = await getSessionUser();
  if (!user) return { res: fail(401, "UNAUTHORIZED", "Sign in required.") };
  return { user };
}

export async function requireAdmin(): Promise<{ user: User } | { res: ReturnType<typeof fail> }> {
  const user = await getSessionUser();
  if (!user) return { res: fail(401, "UNAUTHORIZED", "Sign in required.") };
  if (user.role !== "admin") return { res: fail(403, "FORBIDDEN", "Admin access required.") };
  return { user };
}
