"use client";

import { useState } from "react";
import { useApp } from "@/components/Providers";

export default function BuyPage() {
  const { config } = useApp();
  const [copied, setCopied] = useState(false);

  const token = config?.token;
  const hasCA = !!token?.contractAddress;

  function copyCA() {
    if (!token?.contractAddress) return;
    navigator.clipboard?.writeText(token.contractAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 640 }}>
      <div className="page-hero-strip reveal d1" style={{ textAlign: "center" }}>
        <img src="/assets/ui/logo.png" alt="$TAP" style={{ height: 54 }} />
        <h1 className="display display-lg" style={{ marginTop: 10 }}>BUY <span className="gold-text">$TAP</span></h1>
        <p className="sub strip-sub" style={{ marginLeft: "auto", marginRight: "auto" }}>
          {token?.name || "$TAP Token"} on Solana{token?.cluster ? ` (${token.cluster})` : ""}. Always verify the contract address before trading.
        </p>
      </div>

      <div className="panel panel-pad hover reveal d2" style={{ marginTop: 28 }}>
        <div className="field">
          <label>Contract address</label>
          {!config ? (
            <div className="skeleton" style={{ height: 44 }} />
          ) : hasCA ? (
            <div
              className="wallet-pill mono copyable"
              style={{ justifyContent: "space-between", width: "100%", cursor: "pointer" }}
              onClick={copyCA}
              title="Click to copy"
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{token.contractAddress}</span>
              <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 12 }}>{copied ? "COPIED ✓" : "COPY"}</span>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "16px 8px" }}>
              <div className="big">Contract not announced yet</div>
              <div>The official contract address will be published here. Do not trust addresses from other sources.</div>
            </div>
          )}
        </div>

        {hasCA && token?.explorerUrl && (
          <a
            className="btn btn-ghost btn-block glow-cta"
            style={{ marginBottom: 10 }}
            href={`${token.explorerUrl.replace(/\/$/, "")}/token/${token.contractAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Explorer ↗
          </a>
        )}
      </div>

      <div className="panel panel-pad buy-card reveal d3" style={{ marginTop: 16 }}>
        <h2 className="card-title">Trade</h2>
        {!config ? (
          <div className="skeleton" style={{ height: 90 }} />
        ) : token && token.buyLinks.length > 0 ? (
          token.buyLinks.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="wallet-opt">
              <span className="wicon" style={{ background: "var(--wood)" }}>↗</span>
              {l.label}
              <span className="arrow">→</span>
            </a>
          ))
        ) : (
          <div className="empty-state" style={{ padding: "16px 8px" }}>
            <div className="big">No trading venues announced</div>
            <div>Official trading links will appear here when available.</div>
          </div>
        )}
      </div>

      <hr className="glow-divider" />

      <div className="panel panel-pad reveal d4" style={{ marginTop: 16, borderColor: "var(--gold-deep)" }}>
        <h2 className="card-title" style={{ color: "var(--gold)" }}>Stay safe</h2>
        <ul className="sub" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>Only trust the contract address shown on this page.</li>
          <li>$TAP team will never ask for your seed phrase or private key.</li>
          <li>Wallet connection here is signature-only and never moves funds.</li>
        </ul>
      </div>
    </div>
  );
}
