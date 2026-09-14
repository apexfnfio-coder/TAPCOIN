"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { strings } from "@/i18n/strings";
import { Stat } from "./Stat";
import { sound } from "@/lib/sound";
import { OFFICIAL_TAP_MINT } from "@/modules/games/tap-chimp";

export interface RunSubmitResponse {
  runId: string;
  gameSlug: string;
  level: number;
  targetTrees: number;
  progress: number;
  score: number;
  valid: boolean;
  personalBest: boolean;
  bestScore: number;
  rank: number | null;
  competition: { id: string; name: string; bestScore: number } | null;
  flags: string | null;
  eligibility: { status: string; message: string } | null;
}

interface ResultsPanelProps {
  result: RunSubmitResponse | null;
  local: {
    gameSlug: string;
    level: number;
    targetTrees: number;
    progress: number;
    score: number;
    trees: number;
    green: number;
    redHits: number;
    durationMs: number;
    endedBy: string;
  };
  onPlayAgain: () => void;
  onConnectWallet?: () => void;
  bestScore: number;
  isDemo?: boolean;
}

export function ResultsPanel({
  result,
  local,
  onPlayAgain,
  onConnectWallet,
  bestScore,
  isDemo = false,
}: ResultsPanelProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const secs = Math.round(local.durationMs / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  const delta = bestScore ? Math.abs(local.score - bestScore) : 0;
  const isNewBest = !isDemo && (result?.personalBest || local.score > (bestScore || 0));
  const nearBest = !isDemo && !isNewBest && (bestScore || 0) > 0 && local.score >= (bestScore || 0) - 150;

  const handleShareClick = () => {
    sound.playClick();
    setShowShareModal(true);
  };

  const copyShareText = () => {
    sound.playClick();
    const text = `🪓 I chopped ${local.trees} trees and scored ${local.score.toLocaleString()} PTS on Level ${local.level} in $TAP Chop Game!\n\nCA: ${OFFICIAL_TAP_MINT}\n\nCan you beat my chart climb? Play now: ${window.location.origin}/play\n#TAPCOIN #SolanaGaming`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const openTwitterShare = () => {
    sound.playClick();
    const tweet = `🪓 Just sliced green candles & scored ${local.score.toLocaleString()} PTS on Level ${local.level} in $TAP Chop Game!\n\nCA: ${OFFICIAL_TAP_MINT}\n\nDodge red, chop green. Play on Solana:\n${window.location.origin}/play\n#TAPCOIN $TAP`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadSnapshot = () => {
    sound.playClick();
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark terminal background
    ctx.fillStyle = "#070e14";
    ctx.fillRect(0, 0, 800, 450);

    // Subtle grid lines
    ctx.strokeStyle = "#16282d";
    ctx.lineWidth = 1;
    for (let x = 0; x < 800; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 450);
      ctx.stroke();
    }
    for (let y = 0; y < 450; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "#23403a";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 780, 430);

    // Title / Branding
    ctx.fillStyle = "#f2b53c";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText("$TAP CHOP GAME", 40, 56);

    ctx.fillStyle = "#7d8a8f";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText("CHOP. COLLECT. COMPETE. · SOLANA", 40, 82);

    // Big score
    ctx.fillStyle = "#f5f3e8";
    ctx.font = "bold 64px Arial, sans-serif";
    ctx.fillText(local.score.toLocaleString(), 40, 170);

    ctx.fillStyle = "#f2b53c";
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText("TOTAL SCORE", 40, 200);

    // Stat columns
    ctx.fillStyle = "#f5f3e8";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText(`LVL ${local.level}`, 40, 260);
    ctx.fillStyle = "#7d8a8f";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("LEVEL REACHED", 40, 280);

    ctx.fillStyle = "#f5f3e8";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText(`${local.trees}`, 200, 260);
    ctx.fillStyle = "#7d8a8f";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("TREES CHOPPED", 200, 280);

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText(`+${local.green}`, 360, 260);
    ctx.fillStyle = "#7d8a8f";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("GREEN CANDLES", 360, 280);

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText(`${local.redHits}`, 520, 260);
    ctx.fillStyle = "#7d8a8f";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("RED HITS", 520, 280);

    // Footer link
    ctx.fillStyle = "#f2b53c";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText("Slice green. Dodge red. Play at tapcoin.fun/play", 40, 395);

    // Download image
    const link = document.createElement("a");
    link.download = `tap-chop-score-${local.score}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <>
      <div className="panel results-panel" role="region" aria-label="Game Run Results">
        <div className="results-panel-inner">
          <img
            className="results-ape"
            src="/assets/ape/celebrate.png"
            alt="$TAP Ape"
            style={{ height: 110, width: "auto", objectFit: "contain" }}
          />

          <div className="tagline" style={{ marginTop: 8 }}>
            {local.endedBy === "quit" ? `Run ended on Level ${local.level}` : `You reached Level ${local.level}`}
          </div>

          <div className="results-score" style={{ fontVariantNumeric: "tabular-nums" }}>
            {local.score.toLocaleString()}
          </div>

          {/* Demo Mode Notice */}
          {isDemo && (
            <div className="demo-results-callout">
              <span className="demo-badge-inline">{strings.demoBadge}</span>
              <p className="demo-callout-text">{strings.demoNotice}</p>
            </div>
          )}

          {/* Personal best notifications */}
          {isNewBest && (
            <div className="new-best gold-shimmer">
              🎉 {strings.newPersonalBest}
            </div>
          )}
          {nearBest && (
            <div className="near-best-pill">
              🔥 {delta} {strings.awayFromBest}
            </div>
          )}

          {result && !result.valid && (
            <div className="error-box" style={{ marginTop: 12, textAlign: "left" }}>
              This run was saved but is excluded from rankings. {result.flags ? `Flags: ${result.flags}` : ""}
            </div>
          )}

          {/* Results stats grid */}
          <div className="results-grid" style={{ marginTop: 18 }}>
            <Stat label={strings.levelReached} value={local.level} />
            <Stat label={strings.levelProgress} value={`${local.progress}/${local.targetTrees}`} />
            <Stat label={strings.runTime} value={`${mm}:${ss}`} />
            <Stat label={strings.treesChopped} value={local.trees} />
            <Stat label={strings.greenCandles} value={`+${local.green}`} color="var(--green)" />
            <Stat label={strings.redHits} value={local.redHits} color="var(--red)" />
          </div>

          {/* $TAP rewards breakdown */}
          <div className="panel panel-pad rewards-breakdown-panel" style={{ marginTop: 22, borderColor: "var(--amber)" }}>
            <div className="rewards-header">
              <span className="card-title" style={{ color: "var(--amber)", margin: 0 }}>
                {strings.rewardsBreakdown}
              </span>
              <span className="rewards-badge">ESTIMATED</span>
            </div>
            <div className="stat-grid" style={{ marginTop: 12, gridTemplateColumns: "repeat(3, 1fr)" }}>
              <Stat label={strings.pointsPerTree} value={`~${local.trees * 100} pts`} />
              <Stat label={strings.levelMultiplier} value={`1.${Math.min(9, local.level)}x`} />
              <Stat label={strings.claimCadence} value={strings.claimCadenceValue} />
            </div>
            <p className="sub" style={{ marginTop: 10, color: "var(--muted)", fontSize: "11.5px" }}>
              {strings.rewardsBackendNotice}
            </p>
          </div>

          {/* Rank & Competition info */}
          {result?.rank && (
            <p className="sub" style={{ marginTop: 14 }}>
              Tournament Rank: <b style={{ color: "var(--gold)" }}>#{result.rank}</b>
            </p>
          )}
          {result?.competition && (
            <p className="sub">
              Tournament <b>{result.competition.name}</b> — Best: <b style={{ color: "var(--gold)" }}>{result.competition.bestScore.toLocaleString()}</b>
            </p>
          )}

          {/* CTAs */}
          <div className="results-actions" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            {/* Primary Action */}
            {isDemo ? (
              <button
                type="button"
                className="btn btn-gold btn-lg glow-cta"
                onClick={onConnectWallet}
              >
                {strings.connectToSave}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-gold btn-lg glow-cta"
                onClick={onPlayAgain}
              >
                {strings.playAgain}
              </button>
            )}

            {/* Secondary Action: Share Score */}
            <button
              type="button"
              className="btn btn-wood btn-lg"
              onClick={handleShareClick}
              aria-label={strings.shareScore}
            >
              📤 {strings.shareScore}
            </button>

            {/* Tertiary Action: View Leaderboard */}
            <Link href="/leaderboard" className="btn btn-ghost btn-lg">
              {strings.viewLeaderboard} →
            </Link>

            {isDemo && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onPlayAgain}
                style={{ width: "100%", marginTop: 4 }}
              >
                Play Demo Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Score Modal */}
      {showShareModal && (
        <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div className="tutorial-modal share-modal">
            <div className="tutorial-header">
              <h3 id="share-title" className="card-title" style={{ margin: 0 }}>
                {strings.shareScore}
              </h3>
              <button
                type="button"
                className="tutorial-close-btn"
                onClick={() => setShowShareModal(false)}
                aria-label="Close share dialog"
              >
                ✕
              </button>
            </div>

            <div className="share-preview-card">
              <div className="share-preview-top">
                <span className="gold-text" style={{ fontWeight: 800 }}>$TAP CHOP GAME</span>
                <span className="share-date">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="share-preview-score">{local.score.toLocaleString()} PTS</div>
              <div className="share-preview-details">
                <span>LVL {local.level}</span> · <span>{local.trees} Trees</span> · <span style={{ color: "var(--green)" }}>+{local.green} Greens</span>
              </div>
              <div
                className="share-preview-ca"
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--cream-dim)",
                  background: "rgba(0,0,0,0.45)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,208,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                  cursor: "pointer",
                }}
                onClick={() => {
                  sound.playClick();
                  navigator.clipboard.writeText(OFFICIAL_TAP_MINT);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                title="Click to copy $TAP Contract Address"
              >
                <span>CA: {OFFICIAL_TAP_MINT.slice(0, 6)}…{OFFICIAL_TAP_MINT.slice(-6)}</span>
                <span style={{ color: "var(--gold)", fontSize: 10, fontWeight: 700 }}>
                  {copied ? "✓ COPIED" : "COPY CA 📋"}
                </span>
              </div>
            </div>

            <div className="share-modal-buttons">
              <button
                type="button"
                className="btn btn-gold btn-block"
                onClick={openTwitterShare}
              >
                <img src="/assets/logos/x.png" alt="" width={16} height={16} style={{ verticalAlign: "middle", marginRight: 8, display: "inline-block" }} />
                Share to X (Twitter)
              </button>
              <button
                type="button"
                className="btn btn-wood btn-block"
                onClick={copyShareText}
              >
                {copied ? "✓ Copied to Clipboard!" : "Copy Score Text"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={downloadSnapshot}
              >
                Download Snapshot Card (.PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}