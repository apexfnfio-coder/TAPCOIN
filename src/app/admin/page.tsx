"use client";

import { useEffect, useState } from "react";

interface Overview {
  totals: { users: number; runs: number; trees: number; green: number };
  today: { users: number; runs: number };
  liveCompetitions: number;
  flaggedRuns: number;
  recentRuns: { id: string; username: string; gameSlug: string; level: number; progress: number; targetTrees: number; endedBy: string; score: number; trees: number; durationMs: number; valid: boolean; flags: string | null; createdAt: string }[];
  recentAudit: { id: string; action: string; actor: string; createdAt: string }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j.ok && setData(j.data))
      .catch(() => {});
  }, []);

  if (!data) return <div className="spinner" />;

  return (
    <div>
      <div className="kpi-grid">
        <div className="stat-tile"><div className="k">Players</div><div className="v">{data.totals.users.toLocaleString()}</div></div>
        <div className="stat-tile"><div className="k">Valid runs</div><div className="v cream">{data.totals.runs.toLocaleString()}</div></div>
        <div className="stat-tile"><div className="k">Trees chopped</div><div className="v cream">{data.totals.trees.toLocaleString()}</div></div>
        <div className="stat-tile"><div className="k">Live competitions</div><div className="v" style={{ color: "var(--green)" }}>{data.liveCompetitions}</div></div>
        <div className="stat-tile"><div className="k">New players today</div><div className="v cream">{data.today.users}</div></div>
        <div className="stat-tile"><div className="k">Runs today</div><div className="v cream">{data.today.runs}</div></div>
        <div className="stat-tile" style={data.flaggedRuns > 0 ? { borderColor: "var(--red-deep)" } : undefined}>
          <div className="k">Flagged runs</div>
          <div className="v" style={{ color: data.flaggedRuns > 0 ? "var(--red)" : "var(--cream)" }}>{data.flaggedRuns}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-pad" style={{ paddingBottom: 0 }}><h2 className="card-title">Recent Submissions</h2></div>
          {data.recentRuns.length === 0 ? (
            <div className="empty-state"><div className="big">No runs yet</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Player</th><th style={{ textAlign: "right" }}>Level</th><th style={{ textAlign: "right" }}>Progress</th><th style={{ textAlign: "right" }}>Score</th><th style={{ textAlign: "right" }}>Status</th></tr></thead>
              <tbody>
                {data.recentRuns.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.username}</b><div className="sub mono" style={{ fontSize: 11 }}>{r.gameSlug}</div></td>
                    <td style={{ textAlign: "right" }}>{r.level}</td>
                    <td style={{ textAlign: "right" }}>{r.progress}/{r.targetTrees}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)" }}>{r.score.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>{r.valid ? <span className="chip live">{r.endedBy}</span> : <span className="chip danger" title={r.flags || ""}>Flagged</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-pad" style={{ paddingBottom: 0 }}><h2 className="card-title">Recent Admin Activity</h2></div>
          {data.recentAudit.length === 0 ? (
            <div className="empty-state"><div className="big">No activity yet</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Action</th><th>Actor</th><th style={{ textAlign: "right" }}>When</th></tr></thead>
              <tbody>
                {data.recentAudit.map((a) => (
                  <tr key={a.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{a.action}</td>
                    <td>{a.actor}</td>
                    <td style={{ textAlign: "right" }} className="sub">{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
