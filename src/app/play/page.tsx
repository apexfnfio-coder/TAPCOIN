"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(
  () => import("@/components/GameCanvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="game-loading-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--gold)", fontFamily: "var(--font-display)" }}>
        Loading Arcade Engine…
      </div>
    ),
  }
);
import { ResultsPanel, RunSubmitResponse } from "@/components/ResultsPanel";
import type { RunResult } from "@/game/types";
import { createTapChimpLevel } from "@/modules/games/tap-chimp";
import { Stat } from "@/components/Stat";
import { WalletBadges } from "@/components/WalletBadges";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { strings } from "@/i18n/strings";
import { sound } from "@/lib/sound";
import { LiveTicker } from "@/components/LiveTicker";
import { GlobalChat } from "@/components/GlobalChat";
import { SeasonPassModal } from "@/components/SeasonPassModal";
import { WeaponLoadout } from "@/components/WeaponLoadout";

type Phase = "lobby" | "playing" | "results";

type Eligibility = {
  eligible: boolean;
  status: "eligible" | "ineligible" | "unverified" | "wallet_required";
  message: string;
  valueUsd: number | null;
  minUsd: number;
};

interface LobbyData {
  liveCompetition: { id: string; name: string; endsAt: string; participants: number } | null;
  recentRuns: { id: string; score: number; trees: number; durationMs: number; createdAt: string; level?: number }[];
}

export default function PlayPage() {
  const { me, meLoading, config, refreshMe, openWalletModal } = useApp();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [starting, setStarting] = useState(false);
  const [localRun, setLocalRun] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<RunSubmitResponse | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [colorblindMode, setColorblindMode] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live global trees count wired dynamically from /api/stats/home
  const [globalWeeklyTrees, setGlobalWeeklyTrees] = useState<number>(142850);
  const [treasuryPool, setTreasuryPool] = useState<{
    prizePoolSol: number;
    balanceSol?: number;
    walletBalanceSol?: number;
    totalGameFeesSol?: number;
    buybackBurnPoolSol?: number;
    officialPlayersCount: number;
    season: string;
  } | null>(null);
  const [showSeasonModal, setShowSeasonModal] = useState(false);

  useEffect(() => {
    fetch("/api/stats/home", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && typeof json.data?.totals?.trees === "number") {
          setGlobalWeeklyTrees(json.data.totals.trees);
        }
      })
      .catch(() => {});

    fetch("/api/treasury/pool", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && json.data) {
          setTreasuryPool(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const levelPreview = useMemo(() => config ? createTapChimpLevel(1, config.game) : null, [config]);

  // Load sound state & first-run tutorial check
  useEffect(() => {
    setSoundMuted(sound.isMuted());
    const tutorialCompleted = localStorage.getItem("tap_tutorial_completed");
    if (!tutorialCompleted && !me) {
      setShowTutorial(true);
    }
  }, [me]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/runs?limit=5", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => { if (json.ok) setLobby((previous) => ({ liveCompetition: null, recentRuns: json.data.runs })); })
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!me?.walletAddress) {
      setEligibility(null);
      return;
    }
    fetch("/api/wallet/eligibility", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => json.ok && setEligibility(json.data.eligibility))
      .catch(() => setEligibility(null));
  }, [me?.walletAddress]);

  const handleSoundToggle = () => {
    const next = sound.toggleMute();
    setSoundMuted(next);
  };

  const [submittingRun, setSubmittingRun] = useState(false);

  const startRealRun = useCallback(async () => {
    sound.playClick();
    if (!me?.walletAddress) {
      openWalletModal();
      return;
    }
    if (starting) return;
    setStarting(true);

    // Admins bypass season payment check
    if (me.role !== "admin") {
      try {
        const accessRes = await fetch("/api/access/status", { cache: "no-store" }).then((r) => r.json());
        if (!accessRes?.data?.hasAccess) {
          setShowSeasonModal(true);
          setStarting(false);
          return;
        }
      } catch {
        // Defensive fallback: require access check to succeed
        setShowSeasonModal(true);
        setStarting(false);
        return;
      }
    }

    setDemoMode(false);
    setSubmitResult(null);
    setLocalRun(null);
    setRunKey((value) => value + 1);
    setPhase("playing");
    setStarting(false);
  }, [me?.walletAddress, me?.role, openWalletModal, starting]);

  const startDemoRun = useCallback(() => {
    sound.playClick();
    setDemoMode(true);
    setStarting(false);
    setSubmitResult(null);
    setLocalRun(null);
    setRunKey((value) => value + 1);
    setPhase("playing");
  }, []);

  // Automatically start demo practice if ?demo=1 query parameter is present
  useEffect(() => {
    if (typeof window !== "undefined" && config) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1") {
        startDemoRun();
      }
    }
  }, [config, startDemoRun]);

  const handleEnd = useCallback(async (result: RunResult) => {
    setLocalRun(result);
    setPhase("results");

    if (submittingRun) return;
    setSubmittingRun(true);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug: result.gameSlug,
          level: result.level,
          targetTrees: result.targetTrees,
          progress: result.progress,
          score: result.score,
          trees: result.trees,
          green: result.green,
          redHits: result.redHits,
          durationMs: result.durationMs,
          endedBy: result.endedBy,
          clientVersion: "2.0.0",
        }),
      });
      const text = await res.text();
      const response = text ? JSON.parse(text) : null;

      if (!response?.ok) return;
      const data = response.data;
      setSubmitResult({
        runId: data.run.id,
        gameSlug: data.run.gameSlug,
        level: data.run.level,
        targetTrees: data.run.targetTrees,
        progress: data.run.progress,
        score: data.run.score,
        valid: data.run.valid,
        personalBest: data.stats.isPersonalBest,
        bestScore: data.stats.bestScore,
        rank: data.stats.rank,
        competition: data.competition || null,
        flags: data.run.flags?.join(",") || null,
        eligibility: data.eligibility || null,
      });
      await refreshMe();
    } catch {
      setSubmitResult(null);
    } finally {
      setSubmittingRun(false);
    }
  }, [demoMode, refreshMe, submittingRun]);

  const walletConnected = !!me?.walletAddress;

  // ===== PLAYING VIEW =====
  if (phase === "playing" && config) {
    return (
      <div className="container play-stage">
        <GameCanvas
          key={runKey}
          opts={{ ...config.game, initialLevel: 1 }}
          onEnd={handleEnd}
          onQuit={() => setPhase("lobby")}
          colorblindMode={colorblindMode}
          isDemo={demoMode}
        />
        <p className="sub play-hint">
          <b>Desktop:</b> Use [A] / [D] or Arrows to move · Press [SPACE] or [W] to jump. <b>Mobile:</b> Touch [LEFT] / [RIGHT] pads & [JUMP ▲].
          Chop is automatic at trees. Dodge RED candles & slice GREEN candles!
        </p>
      </div>
    );
  }

  // ===== RESULTS VIEW =====
  if (phase === "results" && localRun) {
    return (
      <div className="container play-stage">
        <ResultsPanel
          result={submitResult}
          local={localRun}
          onPlayAgain={demoMode ? startDemoRun : startRealRun}
          onConnectWallet={openWalletModal}
          bestScore={me?.bestScore ?? 0}
          isDemo={demoMode}
        />
      </div>
    );
  }

  // ===== LOBBY VIEW =====
  return (
    <div className="container play-lobby" style={{ paddingTop: 20 }}>
      {/* First-Run Tutorial Overlay */}
      {mounted && showTutorial && (
        <TutorialOverlay onComplete={() => setShowTutorial(false)} />
      )}

      {/* Monthly Season Pass Modal */}
      <SeasonPassModal
        isOpen={showSeasonModal}
        onClose={() => setShowSeasonModal(false)}
        onUnlocked={() => {
          setShowSeasonModal(false);
          startRealRun();
        }}
      />

      {/* Real-time Arcade Activity Ticker */}
      <LiveTicker />

      <div className="arcade-battle-station">
        {/* Main Battle Station Stage */}
        <div className="battle-station-stage">
          {/* SECTION 1: HERO + VISUAL CANDLE LEGEND */}
      <section className="lobby-hero px-hero" aria-label="Game Hero">
        {/* Parallax background layers */}
        <div className="px-l1" style={{ backgroundImage: "url(/assets/bg/sky.png)" }} />
        <div className="px-l2" style={{ backgroundImage: "url(/assets/bg/far.png)" }} />
        <div className="px-l3" style={{ backgroundImage: "url(/assets/bg/mid.png)" }} />
        <div className="px-ground" style={{ backgroundImage: "url(/assets/bg/ground.png)" }} />
        <div className="px-veil" />
        <div className="leaf-field" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>

        <div className="content px-content hero-showcase-split">
          {/* Left Column: Arcade Metadata, Title, Legend, Copy, CTAs */}
          <div className="hero-col-info">
            <div className="hero-header-meta">
              <div className="hero-badge-group" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span className="eyebrow-chip">{strings.gameTitle}</span>
                <span className="live-status-chip">
                  <span className="live-dot" /> LIVE ON SOLANA
                </span>
                {treasuryPool && (
                  <span
                    className="pool-prize-chip"
                    title="10% of Game Fees distributed to top leaderboard ranks monthly"
                    style={{ background: "rgba(0, 255, 163, 0.15)", border: "1px solid rgba(0, 255, 163, 0.4)", color: "var(--green)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                  >
                    🏆 10% LEADERBOARD POOL: {treasuryPool.prizePoolSol} SOL
                  </span>
                )}
                {treasuryPool && (
                  <span
                    className="pool-burn-chip"
                    title="90% of Game Fees committed to $TAP Buyback & Burn"
                    style={{ background: "rgba(255, 59, 48, 0.15)", border: "1px solid rgba(255, 59, 48, 0.4)", color: "#ff6b6b", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                  >
                    🔥 90% BUYBACK & BURN
                  </span>
                )}
                {treasuryPool && (
                  <span
                    className="pool-players-chip"
                    style={{ background: "rgba(255, 208, 0, 0.12)", border: "1px solid rgba(255, 208, 0, 0.4)", color: "var(--gold)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                  >
                    👥 {treasuryPool.officialPlayersCount} Registered Players
                  </span>
                )}
              </div>
              <div className="hero-quick-prefs">
                <button
                  type="button"
                  className="pref-pill-btn"
                  onClick={() => {
                    sound.playClick();
                    setShowTutorial(true);
                  }}
                  title="Open interactive rules tutorial"
                >
                  📖 Tutorial
                </button>
                <button
                  type="button"
                  className={`pref-pill-btn ${colorblindMode ? "is-active" : ""}`}
                  onClick={() => {
                    sound.playClick();
                    setColorblindMode(!colorblindMode);
                  }}
                  title={colorblindMode ? strings.colorblindOn : strings.colorblindOff}
                >
                  👁️ {colorblindMode ? "Cyan/Orange" : "Colorblind"}
                </button>
              </div>
            </div>

            <h1 className="display display-lg">
              CHOP TIMBER. <span className="gold-text">RIDE THE PUMP.</span> DON'T GET REKT.
            </h1>

            {/* Compact Tactical Battle Legend */}
            <div className="tactical-legend-strip" role="region" aria-label="Tactical Rules Quick Cues">
              <span className="tactical-chip green">🟢 Green: +10 PTS &amp; Combos</span>
              <span className="tactical-chip red">🔴 Red: −25 PTS Penalty</span>
              <span className="tactical-chip gold">🐀 Rat: +10 PTS Stomp</span>
              <span className="tactical-chip orange">🐻 Bear: Counter-Hit ⚡</span>
              <span className="tactical-chip" style={{ color: "var(--cream-dim)" }}>🕳️ Chasm: 0 PTS Safe Leap</span>
            </div>

            <p className="sub lobby-copy">{strings.heroSubcopy}</p>

            {/* CTAs */}
            <div className="lobby-actions">
              <button
                type="button"
                className="btn btn-wood btn-lg demo-btn"
                onClick={startDemoRun}
              >
                <span className="btn-icon">⚡</span>
                <span>{strings.tryDemo}</span>
              </button>

              <button
                type="button"
                className="btn btn-gold btn-lg glow-cta"
                data-cta="playNow"
                onClick={startRealRun}
                disabled={starting || meLoading || !config || config.maintenance}
              >
                <span className="btn-icon">🪓</span>
                <span>
                  {starting
                    ? strings.starting
                    : walletConnected
                    ? "PLAY OFFICIAL RUN (0.01 SOL)"
                    : strings.connectWallet}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {/* Supported Wallets */}
            {!walletConnected && (
              <div className="hero-wallets-block">
                <p className="wallet-required-note">{strings.walletRequiredNote}</p>
                <WalletBadges />
              </div>
            )}

            {walletConnected && eligibility && config?.leaderboardEligibility.enabled && (
              <div className={`eligibility-card ${eligibility.eligible ? "ok" : "warn"}`}>
                <b>Leaderboard Access:</b>
                <span>{eligibility.message}</span>
              </div>
            )}

            {config?.maintenance && (
              <div className="error-box" style={{ marginTop: 14 }}>
                Maintenance mode active — official runs are temporarily suspended.
              </div>
            )}
          </div>

          {/* Right Column: Character Stage Showcase */}
          <div className="hero-col-mascot">
            <div className="mascot-stage-cabinet">
              <div className="mascot-rank-tag">
                <span className="tag-spark">★</span> RANK: DEGEN APE
              </div>
              <div className="mascot-ambient-aura" />
              <div className="mascot-character-wrap">
                <img
                  src="/assets/ape/idle.png"
                  alt="$TAP Ape Mascot"
                  className="mascot-showcase-img float-ape"
                />
              </div>
              <div className="mascot-ground-shadow" />
              <div className="mascot-pedestal">
                <div className="pedestal-surface" />
                <div className="pedestal-trim" />
                <div className="pedestal-label">
                  <span className="pedestal-label-icon">🪓</span>
                  <span>EQUIPPED: RUSTY HATCHET · +10 DMG</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ARCADE TELEMETRY COCKPIT (PERSONAL DOSSIER & ARSENAL) */}
      <section className="lobby-section cockpit-section" aria-label="Battle Station Telemetry">
        <div className="play-cockpit-grid">
          {/* Card 1: Your Personal Degen Record */}
          <div className="panel panel-pad terminal-card your-record-card">
            <div className="terminal-header">
              <span className="eyebrow">{strings.yourRecord}</span>
              {walletConnected && (
                <span className="terminal-tag ok-tag">VERIFIED ON-CHAIN</span>
              )}
            </div>

            <div className="stat-grid compact-stat-grid" style={{ marginTop: 12 }}>
              <Stat
                label={strings.bestScore}
                value={me && me.bestScore > 0 ? me.bestScore.toLocaleString("en-US") : null}
                emptyState={
                  walletConnected ? (
                    <span className="empty-first-run">{strings.firstRunStartsNow}</span>
                  ) : (
                    <div className="empty-action-wrap">
                      <span className="empty-msg">{strings.connectWalletRecord}</span>
                      <button
                        type="button"
                        className="btn btn-gold btn-sm inline-cta-btn"
                        onClick={openWalletModal}
                      >
                        Connect
                      </button>
                    </div>
                  )
                }
              />

              <Stat
                label={strings.totalRuns}
                value={me && me.totalRuns > 0 ? me.totalRuns : null}
                emptyState={
                  walletConnected ? (
                    <span className="empty-first-run">0 runs</span>
                  ) : (
                    <span className="empty-first-run">—</span>
                  )
                }
              />

              <Stat
                label={strings.totalTrees}
                value={me && me.totalTrees > 0 ? me.totalTrees.toLocaleString("en-US") : null}
                emptyState={
                  walletConnected ? (
                    <span className="empty-first-run">0 trees</span>
                  ) : (
                    <span className="empty-fallback-stat" title="Global players weekly progress">
                      {globalWeeklyTrees.toLocaleString("en-US")} (Global weekly)
                    </span>
                  )
                }
              />

              <Stat
                label={strings.tapRewards}
                value={me && me.totalGreen > 0 ? `~${(me.totalGreen * 10).toLocaleString("en-US")} $TAP` : null}
                color="var(--amber)"
                onClick={() => setShowRewardsModal(true)}
                emptyState={
                  <button
                    type="button"
                    className="rewards-breakdown-link"
                    onClick={() => setShowRewardsModal(true)}
                    title="View $TAP rewards rate & mechanics"
                  >
                    View breakdown ⓘ
                  </button>
                }
              />
            </div>

            <div className="global-fallback-note">
              <span>Weekly Canopy Goal: <b>{globalWeeklyTrees.toLocaleString("en-US")} trees</b> cleared across all runs.</span>
            </div>
          </div>

          {/* Card 2: Active Armory Loadout */}
          <div className="panel panel-pad terminal-card">
            <WeaponLoadout />
          </div>
        </div>
      </section>

      {/* SECTION 3: QUICK NAVIGATION & TRANSACTIONAL BUY $TAP */}
      <section className="lobby-section quick-links-section" aria-label="Navigation & Monetization">
        <div className="quick-links-panel">
          <div className="nav-text-links">
            <Link href="/leaderboard" className="quick-nav-link">
              <span>♛</span>
              <span>{strings.leaderboard}</span>
              <span className="arr">→</span>
            </Link>
            <Link href="/profile" className="quick-nav-link">
              <span>👤</span>
              <span>{strings.profile}</span>
              <span className="arr">→</span>
            </Link>
            <Link href="/how-to-play" className="quick-nav-link">
              <span>📖</span>
              <span>{strings.howToPlayNav}</span>
              <span className="arr">→</span>
            </Link>
          </div>

          <div className="buy-tap-wrapper">
            <a
              href={config?.token.buyLinks?.[0]?.url || "https://jup.ag/swap/SOL-TAP"}
              target="_blank"
              rel="noopener noreferrer"
              className="buy-tap-card glow-amber-card"
              title={strings.buyTapTooltip}
              aria-label={strings.buyTapTooltip}
            >
              <div className="buy-tap-glow-orb" />
              <div className="buy-tap-left">
                <div className="buy-tap-badge">DEX MONETIZATION</div>
                <div className="buy-tap-title">{strings.buyTap}</div>
                <div className="buy-tap-dest">Trade on Jupiter / Raydium ↗</div>
              </div>
              <div className="buy-tap-icon" aria-hidden="true">
                <img src="/assets/logos/tap-coin.png" alt="$TAP" width={32} height={32} className="buy-tap-coin-img" />
              </div>
            </a>
          </div>
        </div>
      </section>
        </div>

        {/* Desktop Command Station: Live Trollbox & Top Degens Telemetry */}
        <div className="battle-station-telemetry">
          <GlobalChat docked />
        </div>
      </div>
      
      {/* Floating Live Degens Trollbox for Mobile/Tablet Viewports */}
      <div className="mobile-chat-wrapper">
        <GlobalChat docked={false} />
      </div>

      {/* Rewards Breakdown Modal */}
      {showRewardsModal && (
        <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="rewards-title">
          <div className="tutorial-modal rewards-modal">
            <div className="tutorial-header">
              <h3 id="rewards-title" className="card-title" style={{ color: "var(--amber)", margin: 0 }}>
                {strings.rewardsBreakdown}
              </h3>
              <button
                type="button"
                className="tutorial-close-btn"
                onClick={() => setShowRewardsModal(false)}
                aria-label="Close rewards dialog"
              >
                ✕
              </button>
            </div>

            <div className="rewards-modal-body" style={{ padding: "16px 0" }}>
              <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <Stat label={strings.pointsPerTree} value={strings.pointsPerTreeValue} />
                <Stat label={strings.levelMultiplier} value={strings.levelMultiplierValue} />
                <Stat label={strings.claimCadence} value={strings.claimCadenceValue} />
              </div>

              <div className="rewards-info-box" style={{ marginTop: 18 }}>
                <p className="sub" style={{ margin: 0, lineHeight: 1.6 }}>
                  Slicing GREEN candles accelerates your in-run score multipliers. Accumulated score points qualify you for the monthly leaderboard prize pool and $TAP token buyback & burn benefits.
                </p>
                <p className="sub" style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: "11px" }}>
                  {strings.rewardsBackendNotice}
                </p>
              </div>
            </div>

            <div className="tutorial-actions" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => setShowRewardsModal(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== PHASE 1.1: HERO CANDLE LEGEND =====
function CandleLegend({ colorblindMode }: { colorblindMode: boolean }) {
  const greenColor = colorblindMode ? "var(--cb-green)" : "var(--green)";
  const redColor = colorblindMode ? "var(--cb-orange)" : "var(--red)";
  const greenGlyph = colorblindMode ? "🔷" : "▲";
  const redGlyph = colorblindMode ? "🟠" : "▼";

  return (
    <div
      className="candle-legend"
      role="region"
      aria-label="Core game rules: Green candles reward points, Red candles penalize score"
    >
      {/* Green Candle Card */}
      <div
        className="legend-card legend-card-green"
        style={{
          borderColor: greenColor,
        }}
      >
        <div className="legend-visual">
          <span className="legend-glyph" aria-hidden="true" style={{ color: greenColor }}>
            {greenGlyph}
          </span>
          <img
            src="/assets/candle-green.png"
            alt=""
            className="legend-candle-img pulse-candle"
            aria-hidden="true"
          />
        </div>
        <div className="legend-info">
          <span className="legend-label" style={{ color: greenColor }}>
            {strings.greenPoints}
          </span>
          <span className="legend-delta">+10 PTS</span>
        </div>
      </div>

      {/* Red Candle Card */}
      <div
        className="legend-card legend-card-red"
        style={{
          borderColor: redColor,
        }}
      >
        <div className="legend-visual">
          <span className="legend-glyph" aria-hidden="true" style={{ color: redColor }}>
            {redGlyph}
          </span>
          <img
            src="/assets/candle-red.png"
            alt=""
            className="legend-candle-img pulse-candle-red"
            aria-hidden="true"
          />
        </div>
        <div className="legend-info">
          <span className="legend-label" style={{ color: redColor }}>
            {strings.redPenalty}
          </span>
          <span className="legend-delta">−25 PTS & −3s</span>
        </div>
      </div>
    </div>
  );
}