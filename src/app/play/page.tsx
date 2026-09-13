"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import { GameCanvas } from "@/components/GameCanvas";
import { ResultsPanel, RunSubmitResponse } from "@/components/ResultsPanel";
import type { RunResult } from "@/game/types";
import { createTapChimpLevel } from "@/modules/games/tap-chimp";

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

  const levelPreview = useMemo(() => config ? createTapChimpLevel(1, config.game) : null, [config]);

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

  const startRun = useCallback(async () => {
    if (!me?.walletAddress) {
      openWalletModal();
      return;
    }
    setStarting(true);
    try {
      setSubmitResult(null);
      setLocalRun(null);
      setRunKey((value) => value + 1);
      setPhase("playing");
    } finally {
      setStarting(false);
    }
  }, [me?.walletAddress, openWalletModal]);

  const handleEnd = useCallback(async (result: RunResult) => {
    setLocalRun(result);
    setPhase("results");
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
  }, [lobby?.liveCompetition?.id, refreshMe]);

  if (phase === "playing" && config) {
    return (
      <div className="container play-stage">
        <GameCanvas key={runKey} opts={{ ...config.game, initialLevel: 1 }} onEnd={handleEnd} onQuit={() => setPhase("lobby")} />
        <p className="sub play-hint">Move left/right. Chopping is automatic when you reach a tree. Clear each level to advance to the next.</p>
      </div>
    );
  }

  if (phase === "results" && localRun) {
    return (
      <div className="container play-stage">
        <ResultsPanel result={submitResult} local={localRun} onPlayAgain={startRun} />
      </div>
    );
  }

  const walletConnected = !!me?.walletAddress;

  return (
    <div className="container play-lobby" style={{ paddingTop: 24 }}>
      <div className="lobby-grid">
        <section className="lobby-hero px-hero">
          <div className="px-l1" style={{ backgroundImage: "url(/assets/bg/sky.png)" }} />
          <div className="px-l2" style={{ backgroundImage: "url(/assets/bg/far.png)" }} />
          <div className="px-l3" style={{ backgroundImage: "url(/assets/bg/mid.png)" }} />
          <div className="px-ground" style={{ backgroundImage: "url(/assets/bg/ground.png)" }} />
          <div className="px-veil" />
          <div className="leaf-field" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="content px-content">
            <img src="/assets/ape/idle.png" alt="$TAP Ape" className="float-ape lobby-ape" />
            <div className="eyebrow">$TAP CHOP GAME</div>
            <h1 className="display display-lg">CHOP. <span className="gold-text">COLLECT.</span> COMPETE.</h1>
            <p className="sub lobby-copy">Start at Level 1 and keep clearing levels as difficulty evolves. Every run is different, and every level matters.</p>
            <div className="lobby-actions">
              <button className="btn btn-gold btn-lg" onClick={startRun} disabled={starting || meLoading || !config || config.maintenance}>
                {starting ? "Starting…" : walletConnected ? "Play Now" : "Connect Wallet"}
              </button>
              <Link href="/how-to-play" className="btn btn-ghost btn-lg">How to Play</Link>
            </div>
            {!walletConnected && <div className="wallet-required-note">A connected Solana wallet is required before starting a run.</div>}
            {eligibility && config?.leaderboardEligibility.enabled && (
              <div className={`eligibility-card ${eligibility.eligible ? "ok" : "warn"}`}>
                <b>Leaderboard access</b>
                <span>{eligibility.message}</span>
              </div>
            )}
            {config?.maintenance && <div className="error-box" style={{ marginTop: 14 }}>Maintenance mode is active — runs are temporarily disabled.</div>}
          </div>
        </section>

        <aside className="lobby-side">
          <div className="panel panel-pad lobby-side-card">
            <div className="eyebrow">CURRENT RUN</div>
            <div className="lobby-stat-row">
              <div><span className="sub">Starting level</span><strong>01</strong></div>
              <div><span className="sub">First target</span><strong>{levelPreview?.targetTrees ?? "—"} trees</strong></div>
            </div>
            <div className="lobby-rule"><span>∞</span><span>Levels continue without a predefined maximum. A run ends only when you fail or quit.</span></div>
          </div>

          <div className="panel panel-pad lobby-side-card">
            <div className="eyebrow">LIVE COMPETITION</div>
            {lobby === null ? <div className="skeleton" style={{ height: 70 }} /> : lobby.liveCompetition ? (
              <>
                <h2 className="card-title" style={{ marginBottom: 6 }}>{lobby.liveCompetition.name}</h2>
                <div className="comp-meta"><span>Ends <b>{new Date(lobby.liveCompetition.endsAt).toLocaleString()}</b></span><span>{lobby.liveCompetition.participants.toLocaleString()} players</span></div>
                <Link href="/competitions" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>View Competition</Link>
              </>
            ) : (
              <div className="empty-state compact"><div className="big">No live competition</div><div>Play to improve your run.</div></div>
            )}
          </div>

          <div className="panel panel-pad lobby-side-card">
            <div className="eyebrow">YOUR RECORD</div>
            <div className="stat-grid compact-stat-grid">
              <div className="stat-tile"><div className="k">Best score</div><div className="v">{me ? me.bestScore.toLocaleString() : "—"}</div></div>
              <div className="stat-tile"><div className="k">Runs</div><div className="v cream">{me ? me.totalRuns : "—"}</div></div>
              <div className="stat-tile"><div className="k">Trees</div><div className="v cream">{me ? me.totalTrees.toLocaleString() : "—"}</div></div>
              <div className="stat-tile"><div className="k">$TAP rewards</div><div className="v cream">{me ? me.totalGreen.toLocaleString() : "—"}</div></div>
            </div>
            <div className="lobby-links"><Link href="/leaderboard">Leaderboard →</Link><Link href="/profile">Profile →</Link><Link href="/buy">Buy $TAP →</Link></div>
          </div>
        </aside>
      </div>

      <div className="lobby-footer-strip">
        <span><b>GREEN</b> candles reward points</span><span><b className="danger-text">RED</b> candles hurt your score</span><span><b>LEVEL</b> keeps climbing</span>
      </div>
    </div>
  );
}
