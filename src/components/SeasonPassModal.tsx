"use client";

import React, { useState, useEffect } from "react";
import { PublicKey, SystemProgram, Transaction, Connection } from "@solana/web3.js";
import { useApp } from "./Providers";

const TREASURY_WALLET = "95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7";
const SEASON_FEE_SOL = 0.01;
const SEASON_FEE_LAMPORTS = 10_000_000;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}

export function SeasonPassModal({ isOpen, onClose, onUnlocked }: Props) {
  const { me, refreshMe } = useApp();
  const [phase, setPhase] = useState<"idle" | "preparing" | "signing" | "verifying" | "success" | "manual">("idle");
  const [error, setError] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [manualSig, setManualSig] = useState<string>("");
  const [solscanUrl, setSolscanUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function copyTreasury() {
    navigator.clipboard.writeText(TREASURY_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getActiveProvider(): any {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
    if (w.jupiter?.solana) return w.jupiter.solana;
    if (w.solflare?.isSolflare) return w.solflare;
    if (w.solana) return w.solana;
    return null;
  }

  async function handlePayAndUnlock() {
    setError("");
    const provider = getActiveProvider();

    if (!provider || !provider.publicKey) {
      setError("Please connect your Solana wallet first.");
      return;
    }

    try {
      setPhase("preparing");
      const senderPubkey = provider.publicKey instanceof PublicKey ? provider.publicKey : new PublicKey(provider.publicKey.toString());
      const recipientPubkey = new PublicKey(TREASURY_WALLET);

      // Connect to Solana mainnet for recent blockhash
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports: SEASON_FEE_LAMPORTS,
        })
      );
      tx.recentBlockhash = blockhash;
      tx.feePayer = senderPubkey;

      setPhase("signing");
      let txSig = "";

      // Try signAndSendTransaction or sendTransaction
      if (typeof provider.signAndSendTransaction === "function") {
        const res = await provider.signAndSendTransaction(tx);
        txSig = res?.signature || res;
      } else if (typeof provider.sendTransaction === "function") {
        txSig = await provider.sendTransaction(tx, connection);
      } else {
        throw new Error("Connected wallet does not support direct transaction sending. Use manual transfer below.");
      }

      if (!txSig || typeof txSig !== "string") {
        throw new Error("No transaction signature returned from wallet.");
      }

      setSignature(txSig);
      await verifyOnServer(txSig, senderPubkey.toString());
    } catch (err: any) {
      console.error("[SeasonPassModal] error:", err);
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("user denied")) {
        setError("Transaction was cancelled in the wallet.");
      } else {
        setError(msg || "Failed to complete transaction. You can also transfer manually and paste signature below.");
      }
      setPhase("idle");
    }
  }

  async function verifyOnServer(txSignature: string, walletAddress: string) {
    setPhase("verifying");
    setError("");

    try {
      const res = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: txSignature.trim(),
          wallet: walletAddress.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Failed to verify transaction on-chain.");
      }

      setSolscanUrl(json.data.solscanUrl);
      setPhase("success");
      await refreshMe();
      if (onUnlocked) onUnlocked();
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
      setPhase("idle");
    }
  }

  async function handleManualSubmit() {
    if (!manualSig.trim()) {
      setError("Please enter a transaction signature.");
      return;
    }
    const wallet = me?.walletAddress;
    if (!wallet) {
      setError("Please connect your wallet first.");
      return;
    }
    await verifyOnServer(manualSig.trim(), wallet);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal season-pass-modal panel-pad" style={{ maxWidth: 520, border: "1px solid rgba(0, 255, 163, 0.4)", boxShadow: "0 0 40px rgba(0, 255, 163, 0.15)", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>👑</span>
            <h3 style={{ margin: 0, fontSize: 18, color: "var(--green)", letterSpacing: "0.05em", fontFamily: "var(--font-heading)" }}>
              MONTHLY SEASON PASS
            </h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: "4px 8px" }}>✕</button>
        </div>

        {phase === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
            <h4 style={{ color: "var(--green)", fontSize: 20, margin: "0 0 8px 0" }}>SEASON PASS UNLOCKED!</h4>
            <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 16px 0" }}>
              Your official access is active for this entire month. High scores will rank on the global leaderboard for the 10% Leaderboard Rewards Pool (90% $TAP Buyback & Burn).
            </p>
            {solscanUrl && (
              <div style={{ marginBottom: 20 }}>
                <a href={solscanUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color: "var(--green)", borderColor: "var(--green)" }}>
                  🔍 View Confirmed on Solscan ↗
                </a>
              </div>
            )}
            <button className="btn btn-green w-full" onClick={onClose}>
              START PLAYING NOW
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: "rgba(0, 255, 163, 0.05)", border: "1px solid rgba(0, 255, 163, 0.2)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text-dim)" }}>Seasonal Entry Fee:</span>
                <span style={{ color: "var(--green)", fontWeight: 700, fontFamily: "monospace" }}>0.01 SOL</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text-dim)" }}>Duration:</span>
                <span style={{ color: "var(--gold)", fontWeight: 600 }}>1 Full Month (No repeat fees)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-dim)" }}>Leaderboard Prize:</span>
                <span style={{ color: "var(--text)", fontWeight: 600 }}>Win 10% Leaderboard Prize Pool</span>
              </div>
            </div>

            <div style={{ marginBottom: 16, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              🛡️ <strong>Anti-Cheat & Prize Guarantee:</strong> To prevent bots, sybils, and leaderboard spoofing, every player confirms a 0.01 SOL seasonal entry fee. 10% of entry fees fund the monthly leaderboard rewards pool. 90% is committed to $TAP token buyback & burn to support token liquidity and price.
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>OFFICIAL DEV TREASURY WALLET:</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <code style={{ fontSize: 11, color: "var(--gold)", wordBreak: "break-all" }}>{TREASURY_WALLET}</code>
                <button className="btn btn-ghost btn-xs" onClick={copyTreasury} style={{ flexShrink: 0 }}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(255, 59, 48, 0.1)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            {phase === "manual" ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                  Already transferred 0.01 SOL? Paste Solscan transaction signature:
                </div>
                <input
                  type="text"
                  placeholder="Paste Solana Transaction Signature..."
                  value={manualSig}
                  onChange={(e) => setManualSig(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "#fff", borderRadius: 6, fontSize: 12, marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPhase("idle")} style={{ flex: 1 }}>Back</button>
                  <button className="btn btn-green btn-sm" onClick={handleManualSubmit} style={{ flex: 2 }}>Verify on Solscan</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn btn-green w-full"
                  disabled={phase === "preparing" || phase === "signing" || phase === "verifying"}
                  onClick={handlePayAndUnlock}
                  style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {phase === "preparing" ? "Connecting to Solana..." :
                   phase === "signing" ? "Approve in Wallet..." :
                   phase === "verifying" ? "Verifying On-Chain..." :
                   "⚡ UNLOCK SEASON PASS (0.01 SOL)"}
                </button>

                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => setPhase("manual")}
                    style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Transferred manually? Paste signature here
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
