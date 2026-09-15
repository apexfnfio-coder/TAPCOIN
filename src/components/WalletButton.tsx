"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "./Providers";


declare global {
  interface Window {
    solana?: any;
    solflare?: any;
    jupiter?: any;
  }
}

interface WalletDef {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
  installUrl: string;
  getProvider: () => any;
}

function getJupiterProvider(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;

  // 1. Direct window.jupiter or window.jupiter.solana
  if (w.jupiter?.solana && typeof w.jupiter.solana.connect === "function") return w.jupiter.solana;
  if (w.jupiter && typeof w.jupiter.connect === "function") return w.jupiter;

  // 2. window.jupiterWallet
  if (w.jupiterWallet && typeof w.jupiterWallet.connect === "function") return w.jupiterWallet;

  // 3. Check multi-wallet providers list on window.solana
  if (Array.isArray(w.solana?.providers)) {
    const jup = w.solana.providers.find(
      (p: any) =>
        p?.isJupiter ||
        p?.name?.toLowerCase()?.includes("jupiter") ||
        p?._wallet?.name?.toLowerCase()?.includes("jupiter")
    );
    if (jup && typeof jup.connect === "function") return jup;
  }

  // 4. window.solana explicitly flagged as Jupiter
  if (
    w.solana?.isJupiter ||
    w.solana?.name?.toLowerCase()?.includes("jupiter") ||
    w.solana?._wallet?.name?.toLowerCase()?.includes("jupiter")
  ) {
    if (typeof w.solana.connect === "function") return w.solana;
  }

  // 5. If window.solana exists and is NOT Phantom and NOT Solflare, it is the user's primary/active Solana wallet (e.g. Jupiter)
  if (
    w.solana &&
    !w.solana.isPhantom &&
    !w.solana.isSolflare &&
    typeof w.solana.connect === "function"
  ) {
    return w.solana;
  }

  // 6. Check standard wallets list on window
  if (Array.isArray(w.solanaWallets)) {
    const jup = w.solanaWallets.find((item: any) => item?.name?.toLowerCase()?.includes("jupiter"));
    if (jup) return jup;
  }

  // 7. If user clicked Jupiter and window.solana is present, use window.solana
  if (w.solana && typeof w.solana.connect === "function") {
    return w.solana;
  }

  return null;
}

function getPhantomProvider(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w.solana?.isPhantom) return w.solana;
  if (Array.isArray(w.solana?.providers)) {
    const p = w.solana.providers.find((prov: any) => prov.isPhantom);
    if (p) return p;
  }
  return null;
}

function getSolflareProvider(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (w.solflare?.isSolflare) return w.solflare;
  if (w.solflare && typeof w.solflare.connect === "function") return w.solflare;
  if (w.solana?.isSolflare) return w.solana;
  if (Array.isArray(w.solana?.providers)) {
    const s = w.solana.providers.find((prov: any) => prov.isSolflare);
    if (s) return s;
  }
  return null;
}

function getBackpackProvider(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (w.backpack?.solana?.isBackpack) return w.backpack.solana;
  if (w.backpack && typeof w.backpack.connect === "function") return w.backpack;
  if (w.solana?.isBackpack) return w.solana;
  if (Array.isArray(w.solana?.providers)) {
    const b = w.solana.providers.find((prov: any) => prov.isBackpack || prov.name?.toLowerCase()?.includes("backpack"));
    if (b) return b;
  }
  return null;
}

const WALLETS: WalletDef[] = [
  {
    id: "phantom",
    name: "Phantom",
    color: "#AB9FF2",
    icon: <img src="/assets/logos/phantom.png" alt="Phantom" width={26} height={26} style={{ objectFit: "contain" }} />,
    installUrl: "https://phantom.app",
    getProvider: getPhantomProvider,
  },
  {
    id: "solflare",
    name: "Solflare",
    color: "#FC7227",
    icon: <img src="/assets/logos/solflare.png" alt="Solflare" width={26} height={26} style={{ objectFit: "contain" }} />,
    installUrl: "https://solflare.com",
    getProvider: getSolflareProvider,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    color: "#18c495",
    icon: <img src="/assets/logos/jupiter.png" alt="Jupiter" width={26} height={26} style={{ objectFit: "contain" }} />,
    installUrl: "https://jup.ag",
    getProvider: getJupiterProvider,
  },
  {
    id: "backpack",
    name: "Backpack",
    color: "#E33E38",
    icon: <img src="/assets/logos/backpack.png" alt="Backpack" width={26} height={26} style={{ objectFit: "contain" }} />,
    installUrl: "https://backpack.app",
    getProvider: getBackpackProvider,
  },
  {
    id: "browser-solana",
    name: "Detected Solana Extension",
    color: "#9945FF",
    icon: <img src="/assets/logos/solana.png" alt="Solana" width={26} height={26} style={{ objectFit: "contain" }} />,
    installUrl: "https://solana.com",
    getProvider: () => {
      if (typeof window === "undefined") return null;
      const w = window as any;
      return w.solana ?? w.phantom?.solana ?? w.solflare ?? w.jupiter?.solana ?? w.backpack?.solana ?? null;
    },
  },
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
      const res = await fetch("/api/wallet/eligibility", { cache: "no-store" });
      const text = await res.text();
      const result = text ? JSON.parse(text) : null;
      if (result?.ok) return result.data.eligibility as Eligibility;
    } catch { /* no-op */ }
    return null;
  }

  async function postJson(url: string, body: any) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new Error(`Network error: ${err?.message || "Failed to reach server"}`);
    }

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        res.status >= 500
          ? `Server database error (${res.status}). Verify Railway DATABASE_URL.`
          : `Invalid server response (${res.status}).`
      );
    }

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error?.message || `Request failed with status ${res.status}`);
    }

    return json;
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
      let res: any;
      try {
        res = await provider.connect({ onlyIfTrusted: false });
      } catch {
        res = await provider.connect();
      }
      const pubkey = (res?.publicKey ?? provider.publicKey)?.toString();
      if (!pubkey) throw new Error("Wallet did not return a public key.");

      setPhase("signing");
      const nonceResponse = await postJson("/api/auth/nonce", { wallet: pubkey });

      if (!provider.signMessage) throw new Error(`${w.name} does not support message signing.`);
      const encoded = new TextEncoder().encode(nonceResponse.data.message);
      let sigRes: any;
      try {
        sigRes = await provider.signMessage(encoded, "utf8");
      } catch {
        sigRes = await provider.signMessage(encoded);
      }
      const sigBytes: Uint8Array = sigRes?.signature ?? sigRes;
      const { default: bs58 } = await import("bs58");
      const signature = bs58.encode(sigBytes);

      await postJson("/api/auth/wallet", {
        wallet: pubkey,
        signature,
        nonce: nonceResponse.data.nonce,
      });

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
                  <p className="sub" style={{ marginTop: 0 }}>Select your Solana wallet to link your account, save verified progress, and climb the monthly leaderboard.</p>
                  {error && <div className="wallet-notice">{error}</div>}
                  {WALLETS.map((wallet) => (
                    <button key={wallet.id} className="wallet-opt" disabled={phase === "connecting" || phase === "signing"} onClick={() => connect(wallet)}>
                      <span className="wicon-svg-wrap">{wallet.icon}</span>
                      <span className="wallet-opt-name">{wallet.name}</span>
                      <span className="arrow">→</span>
                    </button>
                  ))}
                  {phase === "signing" && <p className="sub wallet-signing">Please confirm the request in your wallet…</p>}
                  <div className="wallet-requirement">
                    <b>✦ Instant & Gasless Login</b>
                    <span>Connect your wallet to play, track verified ATH scores, and climb the monthly leaderboard.</span>
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
