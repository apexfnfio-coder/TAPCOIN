"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";

interface RunRow {
  id: string; score: number; trees: number; green: number; redHits: number;
  durationMs: number; valid: boolean; createdAt: string; competition: string | null;
}

export default function ProfilePage() {
  const { me, meLoading, refreshMe, openWalletModal } = useApp();
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!me) return;
    fetch("/api/runs?limit=20", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j.ok && setRuns(j.data.runs))
      .catch(() => setRuns([]));
  }, [me]);

  async function saveName() {
    setMsg("");
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name }),
    }).then((x) => x.json());
    if (r.ok) {
      setEditing(false);
      await refreshMe();
      setMsg("Username updated.");
    } else {
      setMsg(r.error?.message || "Could not update username.");
    }
  }

  if (meLoading) return <div className="container"><div className="spinner" /></div>;

  if (!me) {
    return (
      <div className="container" style={{ paddingTop: 60, maxWidth: 560 }}>
        <div className="panel empty-state">
          <img src="/assets/ape/idle.png" alt="" style={{ height: 110 }} />
          <div className="big">No profile yet</div>
          <div>Play a run to create a guest profile instantly — or connect a wallet to secure it.</div>
          <Link href="/play" className="btn btn-gold" style={{ marginTop: 18 }}>▶ Play Now</Link>
        </div>
      </div>
    );
  }

  const playMin = Math.round(me.totalPlayMs / 60000);

  return (
    <div className="container" style={{ paddingTop: 34, maxWidth: 900 }}>
      <div className="panel panel-pad hover reveal d1">
        <div className="profile-head">
          <img src={me.avatar || "/assets/ui/avatar-default.png"} alt="" className="avatar-lg" />
          <div style={{ flex: 1, minWidth: 220 }}>
            {editing ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                  style={{ background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--cream)", padding: "9px 12px", fontSize: 15 }}
                />
                <button className="btn btn-gold btn-sm" onClick={saveName}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <h1 className="display display-md" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {me.username}
                <button className="btn btn-ghost btn-sm" onClick={() => { setName(me.username); setEditing(true); }}>Edit</button>
              </h1>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              {me.walletAddress ? (
                <span className="wallet-pill"><span className="dot" style={{ background: "var(--green)" }} />{me.walletAddress.slice(0, 6)}...{me.walletAddress.slice(-6)}</span>
              ) : (
                <span className="chip">Guest account</span>
              )}
              {me.role === "admin" && <span className="chip scheduled">Admin</span>}
              <span className="sub">Joined {new Date(me.createdAt).toLocaleDateString()}</span>
            </div>
            {msg && <p className="sub" style={{ marginTop: 8, color: "var(--gold)" }}>{msg}</p>}
          </div>
          {me.isGuest && (
            <div className="panel" style={{ padding: 14, maxWidth: 260, borderColor: "var(--gold-deep)" }}>
              <b style={{ color: "var(--gold)" }}>Secure this account</b>
              <p className="sub" style={{ margin: "6px 0 10px" }}>Connect a wallet to keep your stats tied to you forever.</p>
              <span className="btn btn-gold btn-sm" onClick={openWalletModal}>Connect Wallet</span>
            </div>
          )}
        </div>
      </div>

      <div className="stat-grid reveal d2" style={{ marginTop: 20 }}>
        <div className="stat-tile"><div className="k">Best score</div><div className="v">{me.bestScore.toLocaleString("en-US")}</div></div>
        <div className="stat-tile"><div className="k">Total runs</div><div className="v cream">{me.totalRuns}</div></div>
        <div className="stat-tile"><div className="k">Trees chopped</div><div className="v cream">{me.totalTrees.toLocaleString("en-US")}</div></div>
        <div className="stat-tile"><div className="k">Green candles</div><div className="v cream" style={{ color: "var(--green)" }}>{me.totalGreen.toLocaleString("en-US")}</div></div>
        <div className="stat-tile"><div className="k">Red hits</div><div className="v cream" style={{ color: "var(--red)" }}>{me.totalRedHits}</div></div>
        <div className="stat-tile"><div className="k">Time played</div><div className="v cream">{playMin}m</div></div>
      </div>

      <div className="panel hover reveal d3" style={{ marginTop: 22, overflow: "hidden" }}>
        <div className="panel-pad" style={{ paddingBottom: 0 }}><h2 className="card-title">Run History</h2></div>
        {runs === null ? (
          <div style={{ padding: 20 }}>{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 42, marginBottom: 10 }} />)}</div>
        ) : runs.length === 0 ? (
          <div className="empty-state">
            <div className="big">No runs yet</div>
            <div>Hit the forest and post your first score.</div>
            <Link href="/play" className="btn btn-gold" style={{ marginTop: 14 }}>▶ Play Now</Link>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>When</th><th>Mode</th><th style={{ textAlign: "right" }}>Score</th><th style={{ textAlign: "right" }}>Trees</th><th style={{ textAlign: "right" }}>Green</th><th style={{ textAlign: "right" }}>Time</th><th></th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="sub">{new Date(r.createdAt).toLocaleString("en-US")}</td>
                  <td>{r.competition ? <span className="chip live">{r.competition}</span> : <span className="chip">Free play</span>}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)" }}>{r.score.toLocaleString("en-US")}</td>
                  <td style={{ textAlign: "right" }}>{r.trees}</td>
                  <td style={{ textAlign: "right" }}>{r.green}</td>
                  <td style={{ textAlign: "right" }}>{Math.round(r.durationMs / 1000)}s</td>
                  <td style={{ textAlign: "right" }}>{!r.valid && <span className="chip danger">Flagged</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
