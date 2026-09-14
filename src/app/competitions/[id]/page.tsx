"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  trees: number;
  runs: number;
}

interface CompetitionDetail {
  competition: {
    id: string;
    gameSlug: string;
    name: string;
    description: string;
    rules: string;
    status: string;
    startsAt: string;
    endsAt: string;
    rewards: Record<string, string | number>;
    participants: number;
  };
  leaderboard: LeaderboardEntry[];
}

function Countdown({ to, prefix }: { to: string; prefix: string }) {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const tick = () => {
      const ms = new Date(to).getTime() - Date.now();
      if (ms <= 0) { setTxt("now"); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTxt(d > 0
        ? `${d}d ${h}h ${m}m`
        : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [to]);
  return <span>{prefix} <b>{txt}</b></span>;
}

export default function CompetitionDetailPage({ params }: { params: { id: string } }) {
  const { me } = useApp();
  const [data, setData] = useState<CompetitionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/competitions/${params.id}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setData(j.data);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => {
    load();

    // 1. Polling fallback every 4s so leaderboard always stays fresh even without SSE
    const poll = setInterval(() => load(), 4000);

    // 2. Immediate reload on window/tab focus
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    // 3. Live SSE updates if connected
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime?topics=competitions");
      es.addEventListener("competitions", () => load());
      es.onopen = () => setSseConnected(true);
      es.onerror = () => setSseConnected(false);
    } catch { /* no SSE */ }

    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      es?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFound) {
    return (
      <div className="container" style={{ paddingTop: 60, maxWidth: 640 }}>
        <div className="panel empty-state">
          <img src="/assets/props/sign.png" alt="" style={{ height: 90, opacity: 0.85 }} />
          <div className="big">Competition not found</div>
          <div>It may have been archived or the link is incorrect.</div>
          <Link href="/competitions" className="btn btn-ghost" style={{ marginTop: 16 }}>
            ← All Competitions
          </Link>
        </div>
      </div>
    );
  }

  const c = data?.competition;
  const leaderboard = data?.leaderboard ?? [];

  return (
    <div className="container" style={{ paddingTop: 34, maxWidth: 960 }}>
      {/* Back link */}
      <Link
        href="/competitions"
        className="sub"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, textDecoration: "none" }}
      >
        ← All Competitions
      </Link>

      {!c ? (
        /* Skeleton loading */
        <>
          <div className="skeleton" style={{ height: 160, marginBottom: 16, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
        </>
      ) : (
        <>
          {/* Competition header card */}
          <div className="panel comp-card reveal d1" style={{ marginBottom: 20 }}>
            <div
              className="comp-art anim"
              style={{
                backgroundImage: "url(/assets/bg/sky.png), url(/assets/bg/mid.png)",
                backgroundSize: "cover",
                backgroundPosition: "bottom",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span className={`chip ${c.status}`}>
                  <span className={`dot ${c.status === "live" ? "pulse" : ""}`} />
                  {c.status}
                </span>
                {c.status === "live" && (
                  <span className={`chip ${sseConnected ? "live" : ""}`} title={sseConnected ? "Live score updates" : "Static view"}>
                    <span className="dot" />
                    {sseConnected ? "Live" : "Static"}
                  </span>
                )}
              </div>
              <h1 className="display display-md" style={{ marginBottom: 6 }}>{c.name}</h1>
              <div className="sub mono" style={{ fontSize: 11, marginBottom: 8 }}>Module: {c.gameSlug}</div>
              {c.description && (
                <p className="sub" style={{ margin: "0 0 10px" }}>{c.description}</p>
              )}
              <div className="comp-meta">
                {c.status === "live" && <Countdown to={c.endsAt} prefix="Ends in" />}
                {c.status === "scheduled" && <Countdown to={c.startsAt} prefix="Starts in" />}
                {c.status !== "live" && c.status !== "scheduled" && (
                  <span>Ended <b>{new Date(c.endsAt).toLocaleDateString()}</b></span>
                )}
                <span>Players <b>{c.participants.toLocaleString()}</b></span>
                {c.rewards && Object.keys(c.rewards).length > 0 && (
                  <span>
                    Rewards{" "}
                    <b>{Object.entries(c.rewards).map(([k, v]) => `#${k}: ${v}`).join(" · ")}</b>
                  </span>
                )}
              </div>
              {c.rules && (
                <div
                  className="panel"
                  style={{ marginTop: 14, padding: "10px 14px", background: "var(--bg-1)", border: "1px solid var(--line-soft)" }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
                    Rules
                  </div>
                  <p className="sub" style={{ margin: 0 }}>{c.rules}</p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              {c.status === "live" && (
                <Link href="/play" className="btn btn-gold">
                  {me ? "Join" : "Play"}
                </Link>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="panel reveal d2" style={{ overflow: "hidden" }}>
            <div className="panel-pad" style={{ paddingBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="card-title" style={{ margin: 0 }}>Leaderboard</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => load()}
                title="Reload leaderboard rankings"
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                ⟳ Reload
              </button>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <img src="/assets/ape/idle.png" alt="" style={{ height: 90, opacity: 0.8 }} />
                <div className="big">No entries yet</div>
                <div>
                  {c.status === "live"
                    ? "Be the first to post a verified score!"
                    : "No verified scores were submitted for this competition."}
                </div>
                {c.status === "live" && (
                  <Link href="/play" className="btn btn-gold" style={{ marginTop: 18 }}>
                    Play Now
                  </Link>
                )}
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Rank</th>
                    <th>Player</th>
                    <th style={{ textAlign: "right" }}>Score</th>
                    <th style={{ textAlign: "right" }}>Trees</th>
                    <th style={{ textAlign: "right" }}>Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((e) => {
                    const isMe = me && me.id === e.userId;
                    return (
                      <tr
                        key={e.rank}
                        style={isMe ? { background: "rgba(242,181,60,0.06)" } : undefined}
                      >
                        <td>
                          <span className={`rank-badge${e.rank <= 3 ? ` r${e.rank}` : ""}`}>
                            {e.rank}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                            <img
                              src={e.avatar || "/assets/ui/avatar-default.png"}
                              alt=""
                              style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }}
                            />
                            {e.username}
                            {isMe && (
                              <span className="chip" style={{ fontSize: 10 }}>You</span>
                            )}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)", fontSize: 16 }}>
                          {e.score.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>{e.trees.toLocaleString()}</td>
                        <td style={{ textAlign: "right" }} className="sub">{e.runs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
