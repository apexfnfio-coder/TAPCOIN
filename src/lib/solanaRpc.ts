import { TREASURY_WALLET, SEASON_FEE_LAMPORTS } from "./season";

const RPC_ENDPOINTS = [
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana",
  "https://solana-mainnet.rpc.extrnode.com",
];

async function callRpc(method: string, params: any[]) {
  let lastError: any = null;
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) {
        lastError = json.error;
        continue;
      }
      return json.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All Solana RPC endpoints failed");
}

let cachedBalance: { balanceSol: number; prizePoolSol: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 15_000; // 15s cache

/**
 * Live query of dev treasury wallet balance on Solana mainnet.
 * Prize pool is authoritative 10% of total balance.
 */
export async function getTreasuryPool(): Promise<{ balanceSol: number; prizePoolSol: number; rawLamports: number }> {
  const now = Date.now();
  if (cachedBalance && now - cachedBalance.timestamp < CACHE_TTL_MS) {
    return {
      balanceSol: cachedBalance.balanceSol,
      prizePoolSol: cachedBalance.prizePoolSol,
      rawLamports: Math.round(cachedBalance.balanceSol * 1e9),
    };
  }

  try {
    const result = await callRpc("getBalance", [TREASURY_WALLET, { commitment: "confirmed" }]);
    const lamports = typeof result?.value === "number" ? result.value : 0;
    const balanceSol = lamports / 1e9;
    const prizePoolSol = balanceSol * 0.1; // 10% of wallet balance

    cachedBalance = { balanceSol, prizePoolSol, timestamp: now };
    return { balanceSol, prizePoolSol, rawLamports: lamports };
  } catch {
    // If all RPCs temporarily throttle, return last cached or minimum base
    const fallbackBalance = cachedBalance?.balanceSol ?? 0.055;
    return {
      balanceSol: fallbackBalance,
      prizePoolSol: fallbackBalance * 0.1,
      rawLamports: Math.round(fallbackBalance * 1e9),
    };
  }
}

export interface VerifyTxResult {
  valid: boolean;
  error?: string;
  sender?: string;
  amountLamports?: number;
  blockTime?: number;
}

/**
 * Verifies on-chain 0.01 SOL transfer transaction to treasury wallet.
 */
export async function verifySolanaPaymentTx(
  signature: string,
  expectedSender: string
): Promise<VerifyTxResult> {
  try {
    const tx = await callRpc("getTransaction", [
      signature,
      { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 },
    ]);

    if (!tx) {
      return { valid: false, error: "Transaction not found on-chain. Please wait a few seconds and try again." };
    }

    if (tx.meta?.err) {
      return { valid: false, error: "Transaction failed on Solana blockchain." };
    }

    const message = tx.transaction?.message;
    const accountKeys = message?.accountKeys;
    if (!accountKeys || !Array.isArray(accountKeys)) {
      return { valid: false, error: "Transaction message format invalid." };
    }

    // Normalized account keys list (can be objects { pubkey } or strings)
    const pubkeys: string[] = accountKeys.map((k: any) => (typeof k === "string" ? k : k?.pubkey || ""));
    const sender = pubkeys[0]; // Fee payer is primary signer

    if (sender !== expectedSender) {
      return { valid: false, error: `Sender mismatch: expected ${expectedSender}, but transaction was sent by ${sender}` };
    }

    const recipientIndex = pubkeys.indexOf(TREASURY_WALLET);
    if (recipientIndex === -1) {
      return { valid: false, error: `Recipient mismatch: transaction does not include treasury wallet ${TREASURY_WALLET}` };
    }

    // Verify recipient received at least 10,000,000 lamports (0.01 SOL)
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];
    const recipientGain = (postBalances[recipientIndex] ?? 0) - (preBalances[recipientIndex] ?? 0);

    if (recipientGain < SEASON_FEE_LAMPORTS) {
      return {
        valid: false,
        error: `Insufficient payment: transferred ${(recipientGain / 1e9).toFixed(4)} SOL, required 0.01 SOL`,
      };
    }

    return {
      valid: true,
      sender,
      amountLamports: recipientGain,
      blockTime: tx.blockTime,
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Failed to verify transaction on Solana RPC" };
  }
}
