import { getConfig } from "@/lib/config";
import { ok } from "@/lib/http";

/** Public configuration — token info, links, game rules, announcement. */
export async function GET() {
  const cfg = await getConfig();
  return ok({ config: cfg });
}
