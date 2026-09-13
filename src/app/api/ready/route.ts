import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";

/** Readiness probe: verifies the database is reachable. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return ok({ status: "ready", database: "ok" });
  } catch {
    return fail(503, "NOT_READY", "Database unavailable.");
  }
}
