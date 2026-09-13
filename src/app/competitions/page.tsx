"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";

type Filter = "live" | "upcoming" | "ended";

interface Comp {
  id: string; gameSlug: string; name: string; description: string; rules: string;
  status: string; startsAt: string; endsAt: string;
  rewards: Record<string, string | number>;
  participants: number;
  me: { bestScore: number; runs: number } | null;
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
      setTxt(d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [to]);
  return <span>{prefix} <b>{txt}</b></span>;
}

export default function CompetitionsPage() {
  const { me } = useApp();
  const [filter, setFilter] = useState<Filter>("live");
  const [comps, setComps] = useState<Comp[] | null>(null);

  async function load(f: Filter) {
    try {
      const r = await fetch(`/api/competitions?filter=${f}&gameSlug=tap-chimp`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setComps(j.data.competitions);
    } catch { /* keep old */ }
  }

  useEffect(() => {
    setComps(null);
    load(filter);
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime?topics=competitions");
      es.addEventListener("competitions", () => load(filter));
    } catch { /* no SSE */ }
    return () => es?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="container" style={{ paddingTop: 34, maxWidth: 960 }}>
      <div className="page-hero-strip">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <h1 className="display display-lg">COMPETI<span className="gold-text">TIONS</span></h1>
          <div className="tabs">
            {(["live", "upcoming", "ended"] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <p className="sub strip-sub">Timed events. Verified scores. Real rewards.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        {comps === null ? (
          [...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 132 }} />)
        ) : comps.length === 0 ? (
          <div className="panel empty-state">
            <img src="/assets/props/sign.png" alt="" style={{ height: 90, opacity: 0.85 }} />
            <div className="big">
              {filter === "live" && "No live competitions right now"}
              {filter === "upcoming" && "Nothing scheduled yet"}
              {filter === "ended" && "No past competitions"}
            </div>
            <div>Check back soon — new chop events are announced regularly.</div>
          </div>
        ) : (
          comps.map((c, i) => (
            <div key={c.id} className={`panel comp-card hover reveal d${(i % 5) + 1}`}>
              <div className="comp-art anim" style={{ backgroundImage: "url(/assets/bg/sky.png), url(/assets/bg/mid.png)", backgroundSize: "cover", backgroundPosition: "bottom" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className={`chip ${c.status}`}><span className={`dot ${c.status === "live" ? "pulse" : ""}`} />{c.status}</span>
                  <h3 className="comp-name">{c.name}</h3>
                </div>
                {c.description && <p className="sub" style={{ margin: "4px 0 0" }}>{c.description}</p>}
                <div className="sub mono" style={{ fontSize: 11, marginTop: 4 }}>Module: {c.gameSlug}</div>
                <div className="comp-meta">
                  {c.status === "live" && <Countdown to={c.endsAt} prefix="Ends in" />}
                  {c.status === "scheduled" && <Countdown to={c.startsAt} prefix="Starts in" />}
                  {c.status !== "live" && c.status !== "scheduled" && <span>Ended <b>{new Date(c.endsAt).toLocaleDateString()}</b></span>}
                  <span>Players <b>{c.participants.toLocaleString()}</b></span>
                  {c.rewards && Object.keys(c.rewards).length > 0 && (
                    <span>Rewards <b>{Object.entries(c.rewards).map(([k, v]) => `#${k}: ${v}`).join(" · ")}</b></span>
                  )}
                  {c.me && <span>Your best <b style={{ color: "var(--gold)" }}>{c.me.bestScore.toLocaleString()}</b> ({c.me.runs} runs)</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                {c.status === "live" && (
                  <Link href="/play" className="btn btn-gold">{me ? "Join" : "Play"}</Link>
                )}
                <Link href={`/competitions/${c.id}`} className="btn btn-ghost">
                  {c.status === "live" ? "Leaderboard" : c.status === "scheduled" ? "Details" : "View Results"}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
