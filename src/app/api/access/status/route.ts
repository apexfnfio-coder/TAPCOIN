import { getSessionUser } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { checkSeasonAccess, TREASURY_WALLET, SEASON_FEE_SOL } from "@/lib/season";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return fail(401, "UNAUTHORIZED", "Sign in required to check season status.");
  }

  const access = checkSeasonAccess(user);

  return ok({
    ...access,
    wallet: user.walletAddress,
    username: user.username,
    feeSol: SEASON_FEE_SOL,
    recipient: TREASURY_WALLET,
  });
}
