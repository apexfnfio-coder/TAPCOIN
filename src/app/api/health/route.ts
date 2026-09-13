import { ok } from "@/lib/http";

/** Liveness probe: process is up. */
export async function GET() {
  return ok({ status: "ok", service: "tap-web" });
}
