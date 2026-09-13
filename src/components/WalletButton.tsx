"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "./Providers";

declare global {
  interface Window {
    solana?: any;
    solflare?: any;
    backpack?: any;
  }
}

interface WalletDef {
  id: string;
  name: string;
  color: string;
  letter: string;
  getProvider: () => any;
}

const WALLETS: WalletDef[] = [
  { id: "phantom", name: "Phantom", color: "#7c63d9", letter: "Ph", getProvider: () => window.solana?.isPhantom ? window.solana : null },
  { id: "solflare", name: "Solflare", color: "#f6a622", letter: "Sf", getProvider: () => window.solflare?.isSolflare ? window.solflare : (window.solana?.isSolflare ? window.solana : null) },
  { id: "backpack", name: "Backpack", color: "#e33e3e", letter: "Bp", getProvider: () => window.backpack?.solana ?? window.backpack ?? null },
];

type Phase = "idle" | "connecting" | "signing" | "error";

type Eligibility = {
  eligible: boolean;
  status: "eligible" | "ineligible" | "unverified" | "wallet_required";
  message: string;
  valueUsd: number | null;
  minUsd: number;
};

export function WalletButton() {
  const { me, config, refreshMe, walletModalOpen: open, openWalletModal, closeWalletModal } = useApp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const short = (w: string) => `${w.slice(0, 4)}...${w.slice(-4)}`;

  async function checkEligibility() {
    try {
      const result = await fetch("/api/wallet/eligibility", { cache: "no-store" }).then((r) => r.json());
      if (result.ok) return result.data.eligibility as Eligibility;
    } catch { /* no-op */ }
    return null;
  }

  async function connect(w: WalletDef) {
    setError("");
    const provider = w.getProvider();
    if (!provider) {
      setError(`${w.name} was not detected. Install it and try again.`);
      setPhase("error");
      return;
    }
    try {
      setPhase("connecting");
      const res = await provider.connect({ onlyIfTrusted: false });
      const pubkey = (res?.publicKey ?? provider.publicKey)?.toString();
      if (!pubkey) throw new Error("Wallet did not return a public key.");

      setPhase("signing");
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: pubkey }),
      }).then((r) => r.json());
      if (!nonceResponse.ok) throw new Error(nonceResponse.error?.message || "Could not start wallet verification.");

      if (!provider.signMessage) throw new Error(`${w.name} does not support message signing.`);
      const encoded = new TextEncoder().encode(nonceResponse.data.message);
      const sigRes = await provider.signMessage(encoded, "utf8");
      const sigBytes: Uint8Array = sigRes?.signature ?? sigRes;
      const { default: bs58 } = await import("bs58");
      const signature = bs58.encode(sigBytes);

      const verifyResponse = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: pubkey, signature, nonce: nonceResponse.data.nonce }),
      }).then((r) => r.json());
      if (!verifyResponse.ok) throw new Error(verifyResponse.error?.message || "Wallet verification failed.");

      await refreshMe();
      closeWalletModal();
      setPhase("idle");
    } catch (e: any) {
      setPhase("error");
      setError(e?.message?.toLowerCase()?.includes("reject") ? "Signature request was rejected in the wallet." : e?.message || "Connection failed.");
    }
  }

  async function disconnect() {
    try {
      const provider = WALLETS.map((wallet) => wallet.getProvider()).find(Boolean);
      provider?.disconnect?.();
    } catch { /* ignore provider disconnect errors */ }
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshMe();
    closeWalletModal();
  }

  const trigger = me?.walletAddress ? (
    <button className="btn btn-ghost btn-sm wallet-trigger" onClick={openWalletModal} title={me.walletAddress}>
      <span className="dot" style={{ background: "var(--green)" }} />
      {short(me.walletAddress)}
    </button>
  ) : (
    <button className="btn btn-gold btn-sm wallet-trigger" onClick={openWalletModal}>Connect Wallet</button>
  );

  return (
    <>
      {trigger}

      {mounted && open && createPortal(
        <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && closeWalletModal()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
            <div className="modal-head">
              <div className="modal-title" id="wallet-title">{me?.walletAddress ? "Wallet" : "Connect Wallet"}</div>
              <button className="modal-x" onClick={closeWalletModal} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {me?.walletAddress ? (
                <>
                  <p className="sub" style={{ marginTop: 0 }}>Your wallet is securely linked to your game profile.</p>
                  <div className="field">
                    <label>Connected Wallet</label>
                    <div className="wallet-pill mono">{me.walletAddress}</div>
                  </div>
                  <div className="wallet-status-card">
                    <span className="dot" style={{ background: "var(--green)" }} />
                    <div>
                      <b>Connected & Verified</b>
                      <div className="sub">Gasless signature authentication active.</div>
                    </div>
                    {me?.role === "admin" && (
                      <span className="chip" style={{ marginLeft: "auto", background: "rgba(242,181,60,0.16)", borderColor: "var(--gold)", color: "var(--gold)" }}>
                        Admin
                      </span>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-block" onClick={disconnect}>Disconnect</button>
                </>
              ) : (
                <>
                  <p className="sub" style={{ marginTop: 0 }}>Select your Solana wallet to link your account, save progress, and participate in competitions.</p>
                  {error && <div className="wallet-notice">{error}</div>}
                  {WALLETS.map((wallet) => (
                    <button key={wallet.id} className="wallet-opt" disabled={phase === "connecting" || phase === "signing"} onClick={() => connect(wallet)}>
                      <span className="wicon" style={{ background: wallet.color }}>{wallet.letter}</span>
                      <span>{wallet.name}</span><span className="arrow">→</span>
                    </button>
                  ))}
                  {phase === "signing" && <p className="sub wallet-signing">Please confirm the request in your wallet…</p>}
                  <div className="wallet-requirement">
                    <b>✦ Competitive Rankings Tier</b>
                    <span>Holding $10+ in $TAP qualifies your high scores for official leaderboard prizes. Everyone can play and enjoy casual runs.</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && eligibility && createPortal(
        <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && setEligibility(null)}>
          <div className="modal token-gate-modal" role="dialog" aria-modal="true" aria-labelledby="token-gate-title">
            <div className="modal-head">
              <div className="modal-title" id="token-gate-title">$TAP required</div>
              <button className="modal-x" onClick={() => setEligibility(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div className="token-gate-art"><img src="/assets/ape/idle.png" alt="$TAP Ape" /></div>
              <h3 className="card-title" style={{ marginBottom: 6 }}>Your wallet is connected.</h3>
              <p className="sub" style={{ marginTop: 0 }}>To appear on the leaderboard and enter competitive rankings, your wallet needs at least <b style={{ color: "var(--cream)" }}>${eligibility.minUsd.toFixed(2)} worth of $TAP</b>.</p>
              {eligibility.valueUsd !== null && <div className="token-gate-value">Verified value: <b>${eligibility.valueUsd.toFixed(2)}</b></div>}
              <a className="btn btn-gold btn-block" href="/buy">Buy $TAP</a>
              <button className="btn btn-ghost btn-block" onClick={() => setEligibility(null)}>Continue</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
