"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";

type Period = "daily" | "weekly" | "all";

interface Entry {
  rank: number; gameSlug: string; userId: string; username: string; avatar: string;
  score: number; level: number; trees: number; runs: number;
}

export default function LeaderboardPage() {
  const { me, config } = useApp();
  const [period, setPeriod] = useState<Period>("all");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [myRank, setMyRank] = useState<{ rank: number; score: number; level: number } | null>(null);
  const [gameSlug, setGameSlug] = useState("tap-chimp");
  const [live, setLive] = useState(false);
  const [pool, setPool] = useState<{
    totalGameFeesSol: number;
    prizePoolSol: number;
    buybackBurnPoolSol: number;
    officialPlayersCount: number;
    season: string;
  } | null>(null);

  async function load(p: Period, slug = gameSlug) {
    try {
      const r = await fetch(`/api/leaderboard?period=${p}&gameSlug=${slug}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setEntries(j.data.entries);
        setMyRank(j.data.me);
        setGameSlug(j.data.gameSlug);
      }
    } catch { /* keep old */ }
  }

  useEffect(() => {
    fetch("/api/treasury/pool", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setPool(j.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setEntries(null);
    load(period, gameSlug);

    // 1. Polling fallback every 5s so leaderboard constantly stays in sync
    const poll = setInterval(() => load(period, gameSlug), 5000);

    // 2. Refresh immediately on window focus
    const onFocus = () => load(period, gameSlug);
    window.addEventListener("focus", onFocus);

    // 3. SSE subscription
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime?topics=leaderboard");
      es.addEventListener("leaderboard", () => load(period, gameSlug));
      es.onopen = () => setLive(true);
      es.onerror = () => setLive(false);
    } catch { /* no SSE */ }

    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      es?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, gameSlug]);

  return (
    <div className="container" style={{ paddingTop: 34, maxWidth: 920 }}>
      <div className="page-hero-strip">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="display display-lg">GAME <span className="gold-text">LEADERBOARD</span></h1>
            <div className="sub strip-sub">Module: {gameSlug} · {config?.leaderboardEligibility.text || "Verified runs only."}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => load(period, gameSlug)}
              title="Reload leaderboard"
              style={{ fontSize: 12, padding: "7px 12px" }}
            >
              ⟳ Reload
            </button>
            <span className={`chip ${live ? "live" : ""}`}><span className="dot" />{live ? "Live" : "Static"}</span>
            <div className="tabs">
              {(["daily", "weekly", "all"] as Period[]).map((p) => (
                <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
                  {p === "all" ? "All Time" : p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game Fees Tokenomics Breakdown */}
      {pool && (
        <div className="panel reveal d1" style={{ marginTop: 16, padding: "16px 20px", background: "linear-gradient(135deg, rgba(0, 255, 163, 0.08) 0%, rgba(6, 9, 12, 0.9) 100%)", border: "1px solid rgba(0, 255, 163, 0.3)", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.5px" }}>SEASON {pool.season} REWARDS & TOKEN SUPPORT</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Funded 100% by verified player game fees ({pool.officialPlayersCount} active players · {pool.totalGameFeesSol} SOL collected)
                </div>
              </div>
            </div>
            <Link href="/play" className="btn btn-green btn-sm" style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>
              CHOP & CLIMB ↗
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ background: "rgba(0, 255, 163, 0.06)", border: "1px solid rgba(0, 255, 163, 0.2)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>10% Leaderboard Prize Pool</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--green)", fontFamily: "monospace" }}>
                {pool.prizePoolSol} SOL
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Distributed monthly to top verified leaderboard ranks
              </div>
            </div>
            <div style={{ background: "rgba(255, 59, 48, 0.06)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>90% Token Buyback & Burn</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#ff6b6b", fontFamily: "monospace" }}>
                {pool.buybackBurnPoolSol} SOL
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Committed to $TAP market buybacks & token burning
              </div>
            </div>
          </div>
        </div>
      )}

      {myRank && (
        <div className="panel panel-pad reveal d1" style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, borderColor: "var(--gold-deep)" }}>
          <span className="rank-badge r1">#{myRank.rank}</span>
          <div>
            <b>Your position</b>
            <div className="sub">Best score: {myRank.score.toLocaleString()} · Highest level: {myRank.level}</div>
          </div>
        </div>
      )}

      {entries !== null && entries.length >= 3 && (
        <div className="podium reveal d2" style={{ marginTop: 20 }}>
          {[
            { e: entries[1], cls: "silver" },
            { e: entries[0], cls: "first" },
            { e: entries[2], cls: "bronze" },
          ].map(({ e, cls }) => (
            <div key={e.userId} className={`panel podium-col ${cls}`}>
              <img className="podium-avatar" src={e.avatar || "/assets/ui/avatar-default.png"} alt="" />
              <div className="podium-rank">{e.rank}</div>
              <div className="podium-name">{e.username}</div>
              <div className="podium-score">{e.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <div className="panel reveal d3" style={{ marginTop: 20, overflow: "hidden" }}>
        {entries === null ? (
          <div style={{ padding: 20 }}>{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 46, marginBottom: 10 }} />)}</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <img src="/assets/ape/down.png" alt="" style={{ height: 90, opacity: 0.85 }} />
            <div className="big">No verified scores yet</div>
            <div>Connect a qualifying wallet, clear a level, and be first on this game board.</div>
            <Link href="/play" className="btn btn-gold btn-lg" style={{ marginTop: 18, display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span>🪓</span>
              <span>DROP IN & CLAIM #1</span>
            </Link>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th style={{ width: 60 }}>Rank</th><th>Player</th><th style={{ textAlign: "right" }}>Score</th><th style={{ textAlign: "right" }}>Level</th><th style={{ textAlign: "right" }}>Trees</th><th style={{ textAlign: "right" }}>Runs</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.userId} style={me?.id === e.userId ? { background: "rgba(242,181,60,0.06)" } : undefined}>
                  <td><span className={`rank-badge r${e.rank}`}>{e.rank}</span></td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                      <img src={e.avatar || "/assets/ui/avatar-default.png"} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                      {e.username}
                      {me?.id === e.userId && <span className="chip">You</span>}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)", fontSize: 16 }}>{e.score.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{e.level}</td>
                  <td style={{ textAlign: "right" }}>{e.trees.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }} className="sub">{e.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
