"use client";

import Link from "next/link";
import { useApp } from "@/components/Providers";
import { strings } from "@/i18n/strings";
import { WalletBadges } from "@/components/WalletBadges";

export default function HowToPlayPage() {
  const { config, me, openWalletModal } = useApp();
  const walletConnected = Boolean(me && !me.isGuest && me.walletAddress);

  const ptsGreen = config?.game.pointsPerGreen ?? 10;
  const ptsTree = config?.game.pointsPerTree ?? 100;
  const penaltyPts = config?.game.redHitScorePenalty ?? 25;
  const penaltySec = config?.game.redHitPenaltySec ?? 3;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 880 }}>
      {/* Page Header */}
      <div className="page-hero-strip reveal d1" style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img src="/assets/logos/tap-coin.png" alt="$TAP" width={36} height={36} style={{ objectFit: "contain" }} />
          <span className="eyebrow" style={{ letterSpacing: 2 }}>OFFICIAL ARCADE PLAYBOOK</span>
        </div>
        <h1 className="display display-lg" style={{ margin: "0 0 12px" }}>
          HOW TO PLAY <span className="gold-text">$TAP CHOP</span>
        </h1>
        <p className="strip-sub" style={{ maxWidth: 600, margin: "0 auto", fontSize: 15, color: "var(--muted)" }}>
          Master the charts, jump over hazardous red candles, and climb the infinite Solana trading ladder.
        </p>
      </div>

      {/* Guide Card Deck */}
      <div className="how-to-play-deck" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* RULE 01: GREEN CANDLES & TREES */}
        <div className="panel panel-pad" style={{ borderLeft: "4px solid var(--green)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <span className="rule-badge green-badge">RULE 01 · CHOPPING & HARVESTING</span>
              <h2 className="card-title" style={{ color: "var(--green)", margin: "10px 0 8px", fontSize: 22 }}>
                Slice Green Candles & Fell Timber
              </h2>
              <p className="sub" style={{ lineHeight: 1.7, margin: "0 0 16px" }}>
                Approach trees along the track to chop them down. Whenever you see glowing <b>GREEN candles</b>, walk or jump through them to boost your score multiplier and extend your combo streak.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>+{ptsTree} PTS</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Per Tree Cleared</div>
                </div>
                <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>+{ptsGreen} PTS</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Per Green Candle (Combo 2x–10x)</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 24px" }}>
              <img src="/assets/candle-green.png" alt="Green Candle" style={{ width: 68, height: "auto", filter: "drop-shadow(0 0 12px rgba(34, 197, 94, 0.6))" }} />
            </div>
          </div>
        </div>

        {/* RULE 02: JUMPING OVER RED CANDLES & HAZARDS */}
        <div className="panel panel-pad" style={{ borderLeft: "4px solid var(--red)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <span className="rule-badge red-badge">RULE 02 · JUMP MECHANICS & HAZARDS</span>
              <h2 className="card-title" style={{ color: "var(--red)", margin: "10px 0 8px", fontSize: 22 }}>
                Jump Over Red Candles & Obstacles
              </h2>
              <p className="sub" style={{ lineHeight: 1.7, margin: "0 0 14px" }}>
                <b>RED candles</b> represent market dumps: hitting them penalizes your score by <b>−{penaltyPts} PTS</b> and drains <b>−{penaltySec}s</b> of run time. Avoid them by <b>JUMPING</b> cleanly over them!
              </p>
              
              {/* Controls Callout */}
              <div style={{ background: "rgba(255, 210, 94, 0.08)", border: "1px solid rgba(255, 210, 94, 0.25)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--gold)", marginBottom: 6 }}>🎮 HOW TO JUMP:</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--cream)" }}>
                  <div>• <b>Keyboard:</b> Press <kbd style={{ background: "#222", padding: "2px 6px", borderRadius: 4, border: "1px solid #444" }}>SPACE</kbd> or <kbd style={{ background: "#222", padding: "2px 6px", borderRadius: 4, border: "1px solid #444" }}>W</kbd> or <kbd style={{ background: "#222", padding: "2px 6px", borderRadius: 4, border: "1px solid #444" }}>↑</kbd></div>
                  <div>• <b>Mobile:</b> Tap the green <b>JUMP ▲</b> button on the right side of the screen</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--red)" }}>−{penaltyPts} PTS</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Penalty on Red Candle Hit</div>
                </div>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--red)" }}>−{penaltySec}.0s</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Clock Drain on Collision</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 24px" }}>
              <img src="/assets/candle-red.png" alt="Red Candle" style={{ width: 68, height: "auto", filter: "drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))" }} />
            </div>
          </div>
        </div>

        {/* RULE 03: INFINITE PROGRESSION */}
        <div className="panel panel-pad" style={{ borderLeft: "4px solid var(--gold)" }}>
          <span className="rule-badge gold-badge">RULE 03 · INFINITE CHART CLIMB</span>
          <h2 className="card-title" style={{ color: "var(--gold)", margin: "10px 0 8px", fontSize: 22 }}>
            Levels Climb Indefinitely
          </h2>
          <p className="sub" style={{ lineHeight: 1.7, margin: "0 0 14px" }}>
            There is no level ceiling. Clearing a level awards extra time and increases tree targets. As you climb, player speed accelerates, candle frequency rises, and obstacles require sharp jump timing.
          </p>
          <div style={{ background: "rgba(0, 0, 0, 0.35)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 32, color: "var(--gold)", fontWeight: 800 }}>∞</span>
            <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Survive as long as possible. A run ends only when your timer reaches zero or when you choose to cash out.
            </span>
          </div>
        </div>

        {/* RULE 04: SOLANA WALLET */}
        <div className="panel panel-pad" style={{ borderLeft: "4px solid #ab9ff2" }}>
          <span className="rule-badge ok-tag">RULE 04 · SOLANA INTEGRATION</span>
          <h2 className="card-title" style={{ color: "#ab9ff2", margin: "10px 0 8px", fontSize: 22 }}>
            Connect Solana Wallet (Phantom or Solflare)
          </h2>
          <p className="sub" style={{ lineHeight: 1.7, margin: "0 0 16px" }}>
            You can play demo runs as a guest at any time. To participate in the <b>Real-time Degens Chat</b>, save verified high scores to the global leaderboard, and qualify for <b>$TAP</b> community rewards, connect your official Solana wallet.
          </p>
          
          <div style={{ marginTop: 12 }}>
            <WalletBadges />
          </div>

          {!walletConnected ? (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-gold btn-md glow-cta"
                onClick={openWalletModal}
              >
                {strings.connectWallet}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 18, color: "var(--green)", fontWeight: 700, fontSize: 13 }}>
              ✓ Wallet Connected ({me.walletAddress?.slice(0, 4)}…{me.walletAddress?.slice(-4)}) — You are ready to compete!
            </div>
          )}
        </div>

      </div>

      {/* Bottom Launch Bar */}
      <div style={{ marginTop: 40, textAlign: "center", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <Link href="/play" className="btn btn-wood btn-lg">
          ⚡ Try Demo
        </Link>
        <Link href="/play" className="btn btn-gold btn-lg glow-cta">
          🪓 Play Now
        </Link>
      </div>
    </div>
  );
}