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

  // Live global trees count wired dynamically from /api/stats/home
  const [globalWeeklyTrees, setGlobalWeeklyTrees] = useState<number>(142850);

  useEffect(() => {
    fetch("/api/stats/home", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && typeof json.data?.totals?.trees === "number") {
          setGlobalWeeklyTrees(json.data.totals.trees);
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
    fetch("/api/competitions?filter=live&gameSlug=tap-chimp", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        const competition = json.data?.competitions?.[0];
        setLobby((previous) => ({
          liveCompetition: competition ? { id: competition.id, name: competition.name, endsAt: competition.endsAt, participants: competition.participants } : null,
          recentRuns: previous?.recentRuns || [],
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch("/api/runs?limit=5", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => { if (json.ok) setLobby((previous) => ({ liveCompetition: previous?.liveCompetition || null, recentRuns: json.data.runs })); })
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

  const startRealRun = useCallback(async () => {
    sound.playClick();
    if (!me?.walletAddress) {
      openWalletModal();
      return;
    }
    setDemoMode(false);
    setStarting(true);
    setSubmitResult(null);
    setLocalRun(null);
    setRunKey((value) => value + 1);
    setPhase("playing");
  }, [me?.walletAddress, openWalletModal]);

  const startDemoRun = useCallback(() => {
    sound.playClick();
    setDemoMode(true);
    setStarting(false);
    setSubmitResult(null);
    setLocalRun(null);
    setRunKey((value) => value + 1);
    setPhase("playing");
  }, []);

  const handleEnd = useCallback(async (result: RunResult) => {
    setLocalRun(result);
    setPhase("results");

    // In demo mode, runs are local only
    if (demoMode) {
      return;
    }

    try {
      const response = await fetch("/api/runs", {
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
          competitionId: lobby?.liveCompetition?.id,
          clientVersion: "2.0.0",
        }),
      }).then((value) => value.json());

      if (!response.ok) return;
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
    }
  }, [demoMode, lobby?.liveCompetition?.id, refreshMe]);

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
          <b>Desktop:</b> Use Arrow Keys or [A] / [D] to move. <b>Mobile:</b> Touch [LEFT] / [RIGHT] pads.
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
      {showTutorial && (
        <TutorialOverlay onComplete={() => setShowTutorial(false)} />
      )}

      {/* Lobby Top Controls: Colorblind mode, Sound toggle, Tutorial launcher */}
      <div className="lobby-top-toolbar" role="toolbar" aria-label="Accessibility & Preferences">
        <button
          type="button"
          className="btn btn-ghost btn-sm toolbar-btn"
          onClick={() => {
            sound.playClick();
            setShowTutorial(true);
          }}
          title="Open interactive rules tutorial"
          aria-label="Open tutorial"
        >
          <span>📖</span>
          <span className="toolbar-btn-text">Tutorial</span>
        </button>

        <button
          type="button"
          className={`btn btn-ghost btn-sm toolbar-btn ${colorblindMode ? "is-active-pref" : ""}`}
          onClick={() => {
            sound.playClick();
            setColorblindMode(!colorblindMode);
          }}
          title={colorblindMode ? strings.colorblindOn : strings.colorblindOff}
          aria-label={colorblindMode ? strings.colorblindOn : strings.colorblindOff}
        >
          <span>{colorblindMode ? "👁️‍🗨️" : "👁️"}</span>
          <span className="toolbar-btn-text">{colorblindMode ? "Blue/Orange" : "Colorblind"}</span>
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm toolbar-btn"
          onClick={handleSoundToggle}
          title={soundMuted ? strings.soundOff : strings.soundOn}
          aria-label={soundMuted ? strings.soundOff : strings.soundOn}
        >
          <span>{soundMuted ? "🔇" : "🔊"}</span>
          <span className="toolbar-btn-text">{soundMuted ? "Muted" : "Sound"}</span>
        </button>
      </div>

      {/* Real-time Arcade Activity Ticker */}
      <LiveTicker />

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

        <div className="content px-content">
          <div className="hero-ape-container">
            <img src="/assets/ape/idle.png" alt="$TAP Ape" className="float-ape lobby-ape" />
          </div>

          <div className="eyebrow">{strings.gameTitle}</div>
          <h1 className="display display-lg">
            CHOP TIMBER. <span className="gold-text">RIDE THE PUMP.</span> DON'T GET REKT.
          </h1>

          {/* Phase 1.1: Core Mechanic Visual Legend (Visible without scrolling) */}
          <div className="hero-legend-wrapper">
            <CandleLegend colorblindMode={colorblindMode} />
          </div>

          <p className="sub lobby-copy">{strings.heroSubcopy}</p>

          {/* CTAs: Demo Mode & Connect/Play */}
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
              onClick={startRealRun}
              disabled={starting || meLoading || !config || config.maintenance}
            >
              <span className="btn-icon">🪓</span>
              <span>
                {starting
                  ? strings.starting
                  : walletConnected
                  ? strings.playNow
                  : strings.connectWallet}
              </span>
            </button>
          </div>

          {/* Supported Solana Wallets Badges under Connect */}
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
      </section>

      {/* SECTION 2: HOW TO PLAY (FULL RULES EXPANDED) */}
      <section className="lobby-section how-to-play-section" aria-label="Game Rules Guide">
        <div className="section-header">
          <span className="eyebrow">GUIDE & MECHANICS</span>
          <h2 className="card-title display-title">{strings.howToPlay.title}</h2>
          <p className="sub">{strings.howToPlay.subtitle}</p>
        </div>

        <div className="rules-grid">
          {/* Card 1: What to chop */}
          <div className="rule-card rule-card-green">
            <div className="rule-card-header">
              <span className="rule-badge green-badge">BONUS TARGET</span>
              <img src="/assets/candle-green.png" alt="" className="rule-mini-candle" />
            </div>
            <h3 className="rule-title">{strings.howToPlay.whatToChop.title}</h3>
            <p className="sub">{strings.howToPlay.whatToChop.desc}</p>
            <div className="rule-metrics">
              <div className="metric-tag green-tag">{strings.howToPlay.whatToChop.greenBonus}</div>
              <div className="metric-tag green-tag">{strings.howToPlay.whatToChop.treeBonus}</div>
            </div>
          </div>

          {/* Card 2: What to avoid */}
          <div className="rule-card rule-card-red">
            <div className="rule-card-header">
              <span className="rule-badge red-badge">HAZARD</span>
              <img src="/assets/candle-red.png" alt="" className="rule-mini-candle" />
            </div>
            <h3 className="rule-title">{strings.howToPlay.whatToAvoid.title}</h3>
            <p className="sub">{strings.howToPlay.whatToAvoid.desc}</p>
            <div className="rule-metrics">
              <div className="metric-tag red-tag">{strings.howToPlay.whatToAvoid.scorePenalty}</div>
              <div className="metric-tag red-tag">{strings.howToPlay.whatToAvoid.timePenalty}</div>
            </div>
          </div>

          {/* Card 3: Infinite levels */}
          <div className="rule-card rule-card-gold">
            <div className="rule-card-header">
              <span className="rule-badge gold-badge">PROGRESSION</span>
              <span className="infinity-symbol">∞</span>
            </div>
            <h3 className="rule-title">{strings.howToPlay.progression.title}</h3>
            <p className="sub">{strings.howToPlay.progression.desc}</p>
            <div className="rule-metrics">
              <div className="metric-tag gold-tag">Infinite scaling charts</div>
            </div>
          </div>

          {/* Card 4: Run ends on */}
          <div className="rule-card rule-card-neutral">
            <div className="rule-card-header">
              <span className="rule-badge neutral-badge">CONDITIONS</span>
              <span className="rule-icon">⏱️</span>
            </div>
            <h3 className="rule-title">{strings.howToPlay.runEnd.title}</h3>
            <p className="sub">{strings.howToPlay.runEnd.desc}</p>
            <div className="rule-metrics">
              <div className="metric-tag neutral-tag">Timer = 0 or Manual Quit</div>
            </div>
          </div>
        </div>

        {/* Wallet Requirement Card (Placed LAST in rules) */}
        <div className="panel panel-pad wallet-rule-card">
          <div className="wallet-rule-inner">
            <div>
              <h3 className="rule-title" style={{ color: "var(--gold)" }}>
                {strings.howToPlay.wallet.title}
              </h3>
              <p className="sub" style={{ margin: "6px 0 12px", maxWidth: 640 }}>
                {strings.howToPlay.wallet.desc}
              </p>
              <WalletBadges />
            </div>
            {!walletConnected && (
              <button
                type="button"
                className="btn btn-gold btn-md glow-cta"
                onClick={openWalletModal}
              >
                {strings.connectWallet}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: CURRENT RUN & YOUR RECORD STATS */}
      <section className="lobby-section stats-section" aria-label="Player Records & Stats">
        <div className="stats-cards-grid">
          {/* Current Run Card */}
          <div className="panel panel-pad terminal-card">
            <div className="terminal-header">
              <span className="eyebrow">{strings.currentRun}</span>
              <span className="terminal-tag">ACTIVE RUNNER</span>
            </div>
            <div className="lobby-stat-row" style={{ marginTop: 12 }}>
              <div>
                <span className="sub">{strings.startingLevel}</span>
                <strong className="terminal-val">01</strong>
              </div>
              <div>
                <span className="sub">{strings.firstTarget}</span>
                <strong className="terminal-val">{levelPreview?.targetTrees ?? "—"} trees</strong>
              </div>
            </div>
            <div className="lobby-rule" style={{ borderLeftColor: "var(--gold-deep)", marginTop: 16 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--gold)" }}>∞</span>
              <span>{strings.infiniteLevelsRule}</span>
            </div>
          </div>

          {/* Your Record Card (Phase 1.4: Contextual Empty States) */}
          <div className="panel panel-pad terminal-card your-record-card">
            <div className="terminal-header">
              <span className="eyebrow">{strings.yourRecord}</span>
              {walletConnected && (
                <span className="terminal-tag ok-tag">VERIFIED</span>
              )}
            </div>

            <div className="stat-grid compact-stat-grid" style={{ marginTop: 12 }}>
              {/* Best Score with contextual state */}
              <Stat
                label={strings.bestScore}
                value={me && me.bestScore > 0 ? me.bestScore.toLocaleString() : null}
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

              {/* Runs with contextual state */}
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

              {/* Total trees chopped */}
              <Stat
                label={strings.totalTrees}
                value={me && me.totalTrees > 0 ? me.totalTrees.toLocaleString() : null}
                emptyState={
                  walletConnected ? (
                    <span className="empty-first-run">0 trees</span>
                  ) : (
                    <span className="empty-fallback-stat" title="Global players weekly progress">
                      {globalWeeklyTrees.toLocaleString()} (Global weekly)
                    </span>
                  )
                }
              />

              {/* $TAP rewards with interactive breakdown */}
              <Stat
                label={strings.tapRewards}
                value={me && me.totalGreen > 0 ? `~${(me.totalGreen * 10).toLocaleString()} $TAP` : null}
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

            {/* Global fallback note */}
            <div className="global-fallback-note">
              <span>Weekly Milestone: <b>{globalWeeklyTrees.toLocaleString()} trees</b> chopped across all runs.</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: QUICK LINKS & TRANSACTIONAL BUY $TAP CTA (Phase 1.5) */}
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

          {/* Phase 1.5: Distinct Transactional Buy $TAP CTA */}
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
      
      {/* Floating Live Degens Trollbox */}
      <GlobalChat />

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
                  Slicing GREEN candles accelerates your in-run score multipliers. Accumulated score points qualify you for daily $TAP token airdrop tiers and competition prize pools.
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