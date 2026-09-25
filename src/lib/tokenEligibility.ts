import { getConfig, type PublicConfig } from "./config";
import { RANKED_ENTRY_COST_TAP } from "@/modules/games/tap-chimp";

export type EligibilityStatus = "eligible" | "ineligible" | "unverified" | "wallet_required";

export interface TokenEligibilityResult {
  wallet: string | null;
  tokenCa: string;
  minUsd: number;
  priceUsd: number;
  balance: number | null;
  valueUsd: number | null;
  eligible: boolean;
  status: EligibilityStatus;
  message: string;
  priceSource: string;
  tapBalance: number | null;
  rankedEligible: boolean;
  rankedEntryCost: number;
}

function rpcUrlForCluster(cluster: string): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (cluster === "devnet") return "https://api.devnet.solana.com";
  if (cluster === "testnet") return "https://api.testnet.solana.com";
  return "https://api.mainnet-beta.solana.com";
}

function readUiAmount(account: any): number {
  const amount = account?.account?.data?.parsed?.info?.tokenAmount;
  const value = Number(amount?.uiAmountString ?? amount?.uiAmount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function fetchSplBalance(wallet: string, mint: string, cluster: string): Promise<number | null> {
  const rpcUrl = rpcUrlForCluster(cluster);
  if (!rpcUrl) return null;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "tapcoin-eligibility",
      method: "getTokenAccountsByOwner",
      params: [wallet, { mint }, { encoding: "jsonParsed", commitment: "confirmed" }],
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Solana RPC ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "Solana RPC error");
  const accounts = Array.isArray(payload?.result?.value) ? payload.result.value : [];
  return accounts.reduce((sum: number, account: any) => sum + readUiAmount(account), 0);
}

async function fetchLiveTokenPriceUsd(mint: string): Promise<number | null> {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const pairs = Array.isArray(payload?.pairs) ? payload.pairs : [];
  const matches = pairs.filter((pair: any) => pair?.chainId === "solana" && pair?.priceUsd && (
    pair?.baseToken?.address === mint || pair?.quoteToken?.address === mint
  ));
  matches.sort((a: any, b: any) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));
  const price = Number(matches[0]?.priceUsd);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function resolvePrice(config: PublicConfig): Promise<{ priceUsd: number; source: string } | null> {
  if (config.token.priceSource === "api") {
    const live = await fetchLiveTokenPriceUsd(config.token.contractAddress).catch(() => null);
    if (live) return { priceUsd: live, source: "DexScreener" };
    return null;
  }
  const fallback = Number(config.token.priceUsd || 0);
  return fallback > 0 ? { priceUsd: fallback, source: config.token.priceSource } : null;
}

export async function evaluateTokenEligibility(wallet: string | null | undefined, cfg?: PublicConfig): Promise<TokenEligibilityResult> {
  const config = cfg || (await getConfig());
  const tokenCa = config.token.contractAddress;
  const minUsd = Math.max(0, Number(config.token.minHoldingUsd || 0));
  const rankedEntryCost = RANKED_ENTRY_COST_TAP;

  if (!wallet) {
    return {
      wallet: null, tokenCa, minUsd, priceUsd: 0, balance: null, valueUsd: null,
      eligible: false, status: "wallet_required", priceSource: "none",
      message: "Connect a Solana wallet to verify leaderboard eligibility.",
      tapBalance: null, rankedEligible: false, rankedEntryCost,
    };
  }

  if (!tokenCa) {
    return {
      wallet, tokenCa, minUsd, priceUsd: 0, balance: null, valueUsd: null,
      eligible: false, status: "unverified", priceSource: "none",
      message: "Leaderboard eligibility is temporarily unavailable because token configuration is incomplete.",
      tapBalance: null, rankedEligible: false, rankedEntryCost,
    };
  }

  try {
    const [price, balance] = await Promise.all([
      resolvePrice(config),
      fetchSplBalance(wallet, tokenCa, config.token.cluster),
    ]);

    const tapBalance = balance;
    const rankedEligible = tapBalance !== null && tapBalance >= rankedEntryCost;

    if (minUsd <= 0 || !config.leaderboardEligibility?.enabled || config.leaderboardEligibility?.state === "open") {
      return {
        wallet, tokenCa, minUsd: 0, priceUsd: price?.priceUsd || 0, balance, valueUsd: null,
        eligible: true, status: "eligible", priceSource: price?.source || "none",
        message: rankedEligible ?
          `Ranked ready (${Math.floor(tapBalance!)} $TAP). Free play always available.`
          : `Free play active. Hold ${rankedEntryCost} $TAP for ranked leaderboard.`,
        tapBalance, rankedEligible, rankedEntryCost,
      };
    }

    if (!price || balance === null) {
      return {
        wallet, tokenCa, minUsd, priceUsd: price?.priceUsd || 0, balance,
        valueUsd: null, eligible: false, status: "unverified", priceSource: price?.source || "unavailable",
        message: "Casual play active. Connect with enough  to enter official leaderboards.",
        tapBalance, rankedEligible, rankedEntryCost,
      };
    }

    const valueUsd = balance * price.priceUsd;
    const eligible = valueUsd >= minUsd;
    return {
      wallet, tokenCa, minUsd, priceUsd: price.priceUsd, balance, valueUsd, eligible,
      status: eligible ? "eligible" : "ineligible", priceSource: price.source,
      message: eligible
        `Ranked tier active (${valueUsd.toFixed(2)} verified $TAP holding).`
        : `Casual mode (${valueUsd.toFixed(2)} held; ${minUsd.toFixed(2)} unlocks ranked leaderboard).`,
      tapBalance, rankedEligible, rankedEntryCost,
    };
  } catch {
    return {
      wallet, tokenCa, minUsd, priceUsd: 0, balance: null, valueUsd: null,
      eligible: false, status: "unverified", priceSource: "unavailable",
      message: "Casual play active. Gameplay and progress tracking fully enabled.",
      tapBalance: null, rankedEligible: false, rankedEntryCost,
    };
  }
}