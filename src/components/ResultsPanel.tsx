"use client";

import Link from "next/link";

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

export function ResultsPanel({
  result,
  local,
  onPlayAgain,
}: {
  result: RunSubmitResponse | null;
  local: { gameSlug: string; level: number; targetTrees: number; progress: number; score: number; trees: number; green: number; redHits: number; durationMs: number; endedBy: string };
  onPlayAgain: () => void;
}) {
  const secs = Math.round(local.durationMs / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="panel results-panel">
      <div className="results-panel-inner">
        <img className="results-ape" src="/assets/ape/down.png" alt="" style={{ height: 84, width: "auto" }} />
        <div className="tagline" style={{ marginTop: 6 }}>
          {local.endedBy === "quit" ? `Run ended on Level ${local.level}` : `You reached Level ${local.level}`}
        </div>
        <div className="results-score">{local.score.toLocaleString()}</div>
        {result?.personalBest && <div className="new-best">New personal best!</div>}
        {result && !result.valid && (
          <div className="error-box" style={{ marginTop: 12, textAlign: "left" }}>
            This run was saved but is excluded from rankings. {result.flags ? `Flags: ${result.flags}` : ""}
          </div>
        )}
        {!result && <div className="sub" style={{ marginTop: 8 }}>Submitting result...</div>}

        <div className="results-grid">
          <div className="stat-tile reveal d1"><div className="k">Level reached</div><div className="v cream">{local.level}</div></div>
          <div className="stat-tile reveal d2"><div className="k">Level progress</div><div className="v cream">{local.progress}/{local.targetTrees}</div></div>
          <div className="stat-tile reveal d3"><div className="k">Run time</div><div className="v cream">{mm}:{ss}</div></div>
          <div className="stat-tile reveal d4"><div className="k">Green candles</div><div className="v cream" style={{ color: "var(--green)" }}>+{local.green}</div></div>
          <div className="stat-tile reveal d5"><div className="k">Red hits</div><div className="v cream" style={{ color: "var(--red)" }}>{local.redHits}</div></div>
        </div>

        {result?.eligibility && (
          <p className="sub" style={{ color: result.eligibility.status === "eligible" ? "var(--green)" : "var(--cream-dim)" }}>
            {result.eligibility.message}
          </p>
        )}
        {result?.rank && <p className="sub">Game rank: <b style={{ color: "var(--gold)" }}>#{result.rank}</b></p>}
        {result?.competition && (
          <p className="sub">Competition <b>{result.competition.name}</b> — your best: <b style={{ color: "var(--gold)" }}>{result.competition.bestScore.toLocaleString()}</b></p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn btn-gold glow-cta" onClick={onPlayAgain}>Start New Run</button>
          <Link href="/leaderboard" className="btn btn-wood">View Leaderboard</Link>
        </div>
      </div>
    </div>
  );
}
