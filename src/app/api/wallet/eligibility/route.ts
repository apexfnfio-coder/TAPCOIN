import { getSessionUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { ok } from "@/lib/http";
import { evaluateTokenEligibility } from "@/lib/tokenEligibility";

export async function GET() {
  const [user, cfg] = await Promise.all([getSessionUser(), getConfig()]);
  const wallet = user?.walletAddress || null;
  const eligibility = await evaluateTokenEligibility(wallet, cfg);
  return ok({ eligibility });
}
