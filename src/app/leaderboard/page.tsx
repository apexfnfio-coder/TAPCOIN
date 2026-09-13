"use client";

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
    setEntries(null);
    load(period, gameSlug);
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime?topics=leaderboard");
      es.addEventListener("leaderboard", () => load(period, gameSlug));
      es.onopen = () => setLive(true);
      es.onerror = () => setLive(false);
    } catch { /* no SSE */ }
    return () => es?.close();
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
